import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import path from 'path';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { pilotQueueService } from '../services/pilotQueue.js';
import { cache } from '../services/cache.js';
import { displayIdService } from '../services/displayId.js';
import { generateWaiverPdf, getWaiverPdfPath, waiverPdfExists } from '../services/waiverPdf.js';
import { getLocalIP } from '../utils/networkUtils.js';
import { qnap } from '../services/qnapService.js';

const router = Router();
const prisma = new PrismaClient();

const WEB_PORT = process.env.WEB_PORT || '3000';
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || 'skytrackyp.com';

// Helper: Get current server URL (prefer custom domain if set)
const getServerBaseUrl = (): string => {
  // Use custom domain in production
  if (CUSTOM_DOMAIN && CUSTOM_DOMAIN !== 'localhost') {
    return `https://${CUSTOM_DOMAIN}`;
  }
  // Fallback to local IP for development
  const ip = getLocalIP();
  return `https://${ip}:${WEB_PORT}`;
};

// Helper: Generate QR code as data URL
const generateQRCodeDataURL = async (displayId: string): Promise<string> => {
  const url = `${getServerBaseUrl()}/c/${displayId}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
};

// Helper: Generate QR code as buffer (for image endpoint)
const generateQRCodeBuffer = async (displayId: string): Promise<Buffer> => {
  const url = `${getServerBaseUrl()}/c/${displayId}`;
  return QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
};

// GET /api/customers - List customers with pagination, search, filter
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const {
    status,
    date,
    from,
    to,
    search,
    cursor,
    limit = '20',
    pilotId
  } = req.query;

  const take = Math.min(parseInt(limit as string) || 20, 100);

  const where: any = {};

  // Filter by status
  if (status && status !== 'all') {
    where.status = status;
  }

  // Filter by date range (from/to takes precedence over date)
  // process.env.TZ = 'Europe/Istanbul' is set in index.ts, so setHours() uses Turkey time
  if (from || to) {
    const fromDate = from ? new Date(from as string) : new Date(0);
    if (from) fromDate.setHours(0, 0, 0, 0);
    const toDate = to ? new Date(to as string) : new Date();
    toDate.setHours(23, 59, 59, 999);
    where.createdAt = { gte: fromDate, lte: toDate };
  } else if (date) {
    const filterDate = new Date(date as string);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  // Filter by pilot
  if (pilotId) {
    where.assignedPilotId = pilotId;
  }

  // Search by displayId or name
  if (search) {
    where.OR = [
      { displayId: { contains: search as string, mode: 'insensitive' } },
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } },
    ];
  }

  // Cursor-based pagination
  const cursorObj = cursor ? { id: cursor as string } : undefined;

  const customers = await prisma.customer.findMany({
    where,
    take: take + 1, // Get one extra to check if there's more
    cursor: cursorObj,
    skip: cursorObj ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    include: {
      assignedPilot: {
        select: { id: true, name: true },
      },
      flights: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  const hasMore = customers.length > take;
  const data = hasMore ? customers.slice(0, take) : customers;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  // Get total count
  const totalCount = await prisma.customer.count({ where });

  res.json({
    success: true,
    data,
    pagination: {
      nextCursor,
      hasMore,
      totalToday: totalCount,
    },
  });
}));

// Test QR endpoint
router.get('/test-qr', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const displayId = 'T0000';
  const qrCode = await generateQRCodeDataURL(displayId);
  return res.json({ qrCode, displayId, customerName: 'Test Müşteri', pilotName: 'Test Pilot' });
}));

// Test label PNG (58x58mm at 300dpi = 685x685px)
router.get('/test-label', asyncHandler(async (req: AuthRequest, res: any) => {
  const sharp = (await import('sharp')).default;
  const size = 685;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="white"/>
    <rect x="10" y="10" width="${size-20}" height="${size-20}" fill="none" stroke="black" stroke-width="4"/>
    <text x="${size/2}" y="${size/2 - 40}" text-anchor="middle" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="black">SkyTrack</text>
    <text x="${size/2}" y="${size/2 + 30}" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="black">TEST</text>
    <text x="${size/2}" y="${size/2 + 80}" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="black">58 x 58 mm</text>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', 'inline; filename="test-label.png"');
  res.send(buffer);
}));

// GET /api/customers/:id - Get customer by ID or displayId
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Don't use cache for now due to BigInt serialization issues
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ id }, { displayId: id }],
    },
    include: {
      assignedPilot: true,
      flights: {
        include: {
          pilot: { select: { id: true, name: true } },
          mediaFolder: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      sales: {
        include: {
          soldBy: { select: { id: true, name: true, username: true } },
          paymentDetails: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      mediaFolders: true,
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Convert BigInt to Number for JSON serialization
  const serializedCustomer = JSON.parse(
    JSON.stringify(customer, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );

  res.json({
    success: true,
    data: serializedCustomer,
  });
}));

// POST /api/customers - Create new customer with QR and pilot assignment
router.post('/', authenticate, requireRole('ADMIN', 'OFFICE_STAFF', 'KIOSK'), asyncHandler(async (req: AuthRequest, res: any) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    emergencyContact,
    weight,
    waiverSigned,
    signatureData,
    language
  } = req.body;

  // Validation
  if (!firstName || !lastName || !phone) {
    throw new AppError('Ad, soyad ve telefon zorunludur', 400, 'MISSING_FIELDS');
  }

  if (!waiverSigned) {
    throw new AppError('Risk formu onaylanmalıdır', 400, 'WAIVER_REQUIRED');
  }

  // Validate phone format (E.164-ish: optional +, 7-15 digits)
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    throw new AppError('Geçersiz telefon formatı', 400, 'INVALID_PHONE');
  }

  // Validate weight
  if (weight) {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 150) {
      throw new AppError('Kilo 20-150 kg arasında olmalıdır', 400, 'INVALID_WEIGHT');
    }
  }

  // Duplicate kontrolü — aynı isim+telefon ile bugün kayıt var mı?
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const duplicate = await prisma.customer.findFirst({
    where: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.replace(/\s/g, ''),
      createdAt: { gte: today },
      status: { not: 'CANCELLED' },
    },
  });
  if (duplicate) {
    throw new AppError(
      `Bu müşteri bugün zaten kayıtlı (${duplicate.displayId})`,
      400,
      'DUPLICATE_CUSTOMER'
    );
  }

  // Generate display ID and QR code
  const displayId = await displayIdService.generateNext();
  const qrCode = await generateQRCodeDataURL(displayId);

  // Create customer - signatureData will be saved after migration
  const customerData: any = {
    displayId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email?.trim() || null,
    phone: phone.replace(/\s/g, ''),
    emergencyContact: emergencyContact?.trim() || null,
    weight: weight ? parseFloat(weight) : null,
    qrCode,
    waiverSigned: true,
    waiverSignedAt: new Date(),
    kvkkConsent: true,
    kvkkConsentAt: new Date(),
    language: language || 'tr',
    status: 'REGISTERED',
  };

  // Only add signatureData if the field exists in schema (after migration)
  if (signatureData) {
    customerData.signatureData = signatureData;
  }

  let customer;
  try {
    customer = await prisma.customer.create({ data: customerData });
  } catch (dbError: any) {
    // If signatureData field doesn't exist yet, retry without it
    if (dbError.code === 'P2009' || dbError.message?.includes('signatureData')) {
      delete customerData.signatureData;
      customer = await prisma.customer.create({ data: customerData });
    } else {
      throw dbError;
    }
  }

  // Generate waiver PDF if signature data is provided
  let waiverPdfPath: string | null = null;
  if (signatureData) {
    try {
      waiverPdfPath = await generateWaiverPdf({
        displayId: customer.displayId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        signatureData,
        waiverSignedAt: customer.waiverSignedAt!,
        language: customer.language || 'tr',
      });

      // Update customer with PDF path
      await prisma.customer.update({
        where: { id: customer.id },
        data: { waiverPdfPath },
      });

      // Backup PDF to NAS (async, non-blocking)
      if (waiverPdfPath) {
        const today = new Date().toISOString().split('T')[0];
        const filename = path.basename(waiverPdfPath);
        qnap.backupWaiverPdf(waiverPdfPath, today, customer.displayId, filename).catch((err: any) => {
          console.error('[QNAP] Risk formu yedekleme hatası:', err);
        });
      }
    } catch (pdfError) {
      console.error('Error generating waiver PDF:', pdfError);
    }
  }

  // Sıradaki pilotu ÖNERİ olarak kaydet (flight oluşturma, round_count artırma)
  const suggestedPilot = await pilotQueueService.getNextPilot();

  if (suggestedPilot) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { suggestedPilotId: suggestedPilot.id } as any,
    });
  }

  // Admin panele bildir (socket üzerinden bekleyen müşteri var)
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('customer:pending-approval', {
      customerId: customer.id,
      displayId,
      pilotId: suggestedPilot?.id,
      pilotName: suggestedPilot?.name,
    });
    io.to('admin').emit('customer:created', {
      customer: { displayId, firstName: customer.firstName, lastName: customer.lastName, weight: customer.weight },
      pilot: suggestedPilot ? { name: suggestedPilot.name } : null,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      customer: { ...customer, suggestedPilotId: suggestedPilot?.id },
      qrCode,
      qrUrl: `${getServerBaseUrl()}/c/${displayId}`,
      pilotAssigned: false,
      pilot: null,
      suggestedPilot: suggestedPilot ? {
        id: suggestedPilot.id,
        name: suggestedPilot.name,
      } : null,
      message: suggestedPilot
        ? `Önerilen pilot: ${suggestedPilot.name} — Onay bekleniyor`
        : 'Şu an müsait pilot yok.',
    },
  });
}));

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, emergencyContact, weight, waiverSigned, status } = req.body;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      email: email?.trim() || null,
      phone: phone?.replace(/\s/g, ''),
      emergencyContact: emergencyContact?.trim() || null,
      weight: weight ? parseFloat(weight) : undefined,
      waiverSigned,
      waiverSignedAt: waiverSigned ? new Date() : undefined,
      status,
    },
    include: {
      assignedPilot: { select: { id: true, name: true } },
    },
  });

  // Invalidate cache
  await cache.customer.invalidate(id);

  res.json({
    success: true,
    data: customer,
  });
}));

// POST /api/customers/:id/confirm-pilot - Admin onayı: önerilen pilotu ata veya farklı pilot seç
router.post('/:id/confirm-pilot', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { pilotId } = req.body; // Opsiyonel: farklı pilot seçildiyse

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Zaten atanmış müşteriyi tekrar atama
  if (customer.assignedPilotId && customer.status !== 'REGISTERED') {
    throw new AppError('Bu müşteriye zaten pilot atanmış', 400, 'ALREADY_ASSIGNED');
  }

  const io = req.app.get('io');
  // Hangi pilot atanacak: admin seçtiyse o, yoksa önerilen pilot
  const targetPilotId = pilotId || (customer as any).suggestedPilotId;

  if (!targetPilotId) {
    throw new AppError('Atanacak pilot bulunamadı', 400, 'NO_PILOT');
  }

  // Eğer admin farklı pilot seçtiyse ve önerilen pilot varsa → önerilen pilota feragat ver
  if (pilotId && (customer as any).suggestedPilotId && pilotId !== (customer as any).suggestedPilotId) {
    const { forfeitPilot } = await import('../services/roundCounter.js');
    await forfeitPilot((customer as any).suggestedPilotId);
  }

  // Gerçek atamayı yap (flight oluştur, round_count +1, bildirim gönder)
  const assignment = await pilotQueueService.assignPilotToCustomer(
    customer.id,
    customer.displayId,
    io,
    targetPilotId
  );

  if (!assignment) {
    throw new AppError('Pilot atanamadı', 400, 'ASSIGNMENT_FAILED');
  }

  // suggestedPilotId temizle
  await prisma.customer.update({
    where: { id: customer.id },
    data: { suggestedPilotId: null } as any,
  });

  // QNAP NAS'ta müşteri klasörü oluştur
  try {
    const today = new Date().toISOString().split('T')[0];
    const pilot = assignment.pilot;
    const safeName = pilot.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ-]/g, '').trim();
    const sortiNo = Math.max(1, (pilot.dailyFlightCount ?? 0) + 1);
    const relPath = `${today}/${safeName}/${sortiNo}_sorti/${customer.displayId}`;
    await qnap.createFolder(relPath);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { mediaFolderPath: `media/${relPath}` },
    });
  } catch (err) {
    console.error('[QNAP] Klasör oluşturma hatası:', err);
  }

  const updatedCustomer = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      assignedPilot: { select: { id: true, name: true, dailyFlightCount: true } },
    },
  });

  // Print servise etiket bas sinyali gönder
  const printIo = req.app.get('io');
  if (printIo) {
    printIo.to('admin').emit('print:label', {
      customerId: customer.id,
      displayId: customer.displayId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      pilotName: assignment.pilot.name,
    });
  }

  res.json({
    success: true,
    data: {
      customer: updatedCustomer,
      pilot: { id: assignment.pilot.id, name: assignment.pilot.name },
      message: `Pilot atandı: ${assignment.pilot.name}`,
    },
  });
}));

// POST /api/customers/:id/forfeit-pilot - Önerilen pilota feragat ver, sıradaki pilotu öner
router.post('/:id/forfeit-pilot', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  const sugPilotId = (customer as any).suggestedPilotId;
  if (!sugPilotId) {
    throw new AppError('Feragat edilecek pilot yok', 400, 'NO_SUGGESTED_PILOT');
  }

  // Önerilen pilota feragat ver (round_count +1, forfeit_count +1)
  const { forfeitPilot } = await import('../services/roundCounter.js');
  await forfeitPilot(sugPilotId);

  // Cache temizle
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(sugPilotId);

  // Sıradaki pilotu bul
  const nextPilot = await pilotQueueService.getNextPilot();

  // Yeni öneriyi kaydet
  await prisma.customer.update({
    where: { id: customer.id },
    data: { suggestedPilotId: nextPilot?.id || null } as any,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('pilot:queue-updated');
  }

  res.json({
    success: true,
    data: {
      suggestedPilot: nextPilot ? { id: nextPilot.id, name: nextPilot.name } : null,
      message: nextPilot
        ? `Feragat verildi. Yeni öneri: ${nextPilot.name}`
        : 'Feragat verildi. Müsait pilot yok.',
    },
  });
}));

// GET /api/customers/:id/waiver-pdf - Download waiver PDF (public - no auth required)
router.get('/:id/waiver-pdf', asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ id }, { displayId: id }],
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Check if PDF exists
  const pdfPath = getWaiverPdfPath(customer.displayId);
  if (!waiverPdfExists(customer.displayId)) {
    // Try to generate PDF if signature data exists
    if (customer.signatureData && customer.waiverSignedAt) {
      try {
        await generateWaiverPdf({
          displayId: customer.displayId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          signatureData: customer.signatureData,
          waiverSignedAt: customer.waiverSignedAt,
          language: customer.language || 'tr',
        });
      } catch (error) {
        throw new AppError('PDF oluşturulamadı', 500, 'PDF_GENERATION_ERROR');
      }
    } else {
      throw new AppError('Risk formu PDF bulunamadı', 404, 'WAIVER_PDF_NOT_FOUND');
    }
  }

  // Format filename: MusteriAdi_Soyadi_YYYY-MM-DD.pdf
  const date = customer.waiverSignedAt
    ? customer.waiverSignedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const safeName = `${customer.firstName}_${customer.lastName}`.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9_]/g, '');
  const fileName = `${safeName}_${date}.pdf`;

  res.download(pdfPath, fileName);
}));

// GET /api/customers/:id/qr - Get QR code as image

// GET /api/customers/:id/label - Customer label PDF (58x58mm)
router.get('/:id/label', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const customer = await prisma.customer.findFirst({
    where: { OR: [{ id }, { displayId: id }] },
    include: { assignedPilot: true },
  });
  if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');

  const qrBuffer = await generateQRCodeBuffer(customer.displayId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const PDFDocument = (await import('pdfkit')).default;
  const mm = (v: number) => v * 2.83465;

  const doc = new PDFDocument({ size: [mm(58), mm(58)], margin: 0 });
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `inline; filename="${customer.displayId}-label.pdf"`);
  doc.pipe(res);

  const cx = mm(29);
  const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  doc.registerFont('Label', fontPath);
  doc.font('Label');

  // Date/time
  doc.fontSize(11).text(`${dateStr} - ${timeStr}`, 0, mm(3), { align: 'center', width: mm(58) });

  // QR code
  const qrSize = mm(32);
  doc.image(qrBuffer, cx - qrSize / 2, mm(11), { width: qrSize, height: qrSize });

  // Display ID + name
  const name = `${customer.firstName} ${customer.lastName}`;
  doc.fontSize(10).text(`${customer.displayId} - ${name}`, 0, mm(45), { align: 'center', width: mm(58) });
  if (customer.assignedPilot) {
    doc.fontSize(10).text(`Pilot: ${customer.assignedPilot.name}`, 0, mm(50), { align: 'center', width: mm(58) });
  }

  doc.end();
}));

router.get('/:id/qr', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { format = 'png' } = req.query;

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ id }, { displayId: id }],
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (format === 'json') {
    // Return as data URL
    const qrCode = await generateQRCodeDataURL(customer.displayId);
    return res.json({
      success: true,
      data: {
        displayId: customer.displayId,
        qrCode,
        url: `${getServerBaseUrl()}/c/${customer.displayId}`,
      },
    });
  }

  // Return as image
  const buffer = await generateQRCodeBuffer(customer.displayId);
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `inline; filename="${customer.displayId}-qr.png"`);
  res.send(buffer);
}));

// POST /api/customers/:id/reassign-pilot - Reassign pilot
router.post('/:id/reassign-pilot', authenticate, requireRole('ADMIN', 'OFFICE_STAFF'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { pilotId } = req.body;

  const io = req.app.get('io');
  const pilot = await pilotQueueService.reassignPilot(id, pilotId, io);

  if (!pilot) {
    throw new AppError('Müsait pilot bulunamadı', 400, 'NO_PILOT_AVAILABLE');
  }

  // Invalidate customer cache
  await cache.customer.invalidate(id);

  res.json({
    success: true,
    data: {
      pilot: {
        id: pilot.id,
        name: pilot.name,
      },
      message: `Yeni pilot atandı: ${pilot.name}`,
    },
  });
}));

// GET /api/c/:displayId - Public landing page data
router.get('/public/:displayId', asyncHandler(async (req: AuthRequest, res: any) => {
  const { displayId } = req.params;

  const customer = await prisma.customer.findUnique({
    where: { displayId },
    select: {
      id: true,
      displayId: true,
      firstName: true,
      status: true,
      language: true,
      assignedPilot: {
        select: { id: true, name: true },
      },
      flights: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          takeoffAt: true,
          landingAt: true,
          mediaFolder: {
            select: {
              id: true,
              fileCount: true,
              deliveryStatus: true,
              paymentStatus: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  const flight = customer.flights[0] || null;
  const mediaFolder = flight?.mediaFolder || null;

  // Check if there is an unpaid Foto/Video sale for this customer
  const unpaidMediaSale = await prisma.sale.findFirst({
    where: {
      customerId: customer.id,
      itemType: 'Foto/Video',
      paymentStatus: 'UNPAID',
    },
    select: { id: true },
  });

  const hasPendingPayment = !!unpaidMediaSale;

  res.json({
    success: true,
    data: {
      displayId: customer.displayId,
      firstName: customer.firstName,
      language: customer.language || 'tr',
      status: customer.status,
      pilot: customer.assignedPilot,
      flight: flight ? {
        status: flight.status,
        takeoffAt: flight.takeoffAt,
        landingAt: flight.landingAt,
      } : null,
      media: (mediaFolder || hasPendingPayment) ? {
        fileCount: mediaFolder?.fileCount ?? 0,
        deliveryStatus: mediaFolder?.deliveryStatus ?? 'PENDING',
        canDownload: mediaFolder?.paymentStatus === 'PAID' || mediaFolder?.deliveryStatus === 'DELIVERED',
        hasPendingPayment,
      } : null,
    },
  });
}));

export default router;

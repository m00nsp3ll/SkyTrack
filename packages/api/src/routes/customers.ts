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
router.post('/', authenticate, requireRole('ADMIN', 'OFFICE_STAFF'), asyncHandler(async (req: AuthRequest, res: any) => {
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

  // Validate phone format (Turkish mobile)
  const phoneRegex = /^(05\d{9}|\+905\d{9})$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    throw new AppError('Geçersiz telefon formatı (05XX XXX XX XX)', 400, 'INVALID_PHONE');
  }

  // Validate weight
  if (weight) {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 150) {
      throw new AppError('Kilo 20-150 kg arasında olmalıdır', 400, 'INVALID_WEIGHT');
    }
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

  // Try to assign a pilot
  const io = req.app.get('io');
  const assignment = await pilotQueueService.assignPilotToCustomer(
    customer.id,
    customer.displayId,
    io
  );

  // Get updated customer with pilot info
  const updatedCustomer = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      assignedPilot: { select: { id: true, name: true } },
    },
  });

  // QNAP NAS'ta müşteri klasörü oluştur (hata olsa da kayıt devam eder)
  try {
    const today = new Date().toISOString().split('T')[0];
    const pilotName = updatedCustomer?.assignedPilot?.name || 'Pilot_Yok';
    const folderPath = await qnap.createCustomerFolder(today, pilotName, customer.displayId);
    if (folderPath) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { mediaFolderPath: folderPath },
      });
    }
  } catch (err) {
    console.error('[QNAP] Klasör oluşturma hatası, kayıt devam ediyor:', err);
  }

  res.status(201).json({
    success: true,
    data: {
      customer: updatedCustomer,
      qrCode,
      qrUrl: `${getServerBaseUrl()}/c/${displayId}`,
      pilotAssigned: assignment !== null,
      pilot: assignment?.pilot ? {
        id: assignment.pilot.id,
        name: assignment.pilot.name,
      } : null,
      message: assignment
        ? `Pilot atandı: ${assignment.pilot.name}`
        : 'Şu an müsait pilot yok. Müşteri bekleme listesinde.',
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

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { pilotQueueService } from '../services/pilotQueue.js';
import { cache } from '../services/cache.js';

const router = Router();
const prisma = new PrismaClient();

const SERVER_IP = process.env.SERVER_IP || 'localhost';

// Helper: Generate display ID (ST-YYYYMMDD-NNN)
const generateDisplayId = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ST-${dateStr}-`;

  const lastCustomer = await prisma.customer.findFirst({
    where: { displayId: { startsWith: prefix } },
    orderBy: { displayId: 'desc' },
  });

  let nextNum = 1;
  if (lastCustomer) {
    const lastNum = parseInt(lastCustomer.displayId.split('-')[2], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(3, '0')}`;
};

// Helper: Generate QR code as data URL
const generateQRCodeDataURL = async (displayId: string): Promise<string> => {
  const url = `http://${SERVER_IP}/c/${displayId}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
};

// Helper: Generate QR code as buffer (for image endpoint)
const generateQRCodeBuffer = async (displayId: string): Promise<Buffer> => {
  const url = `http://${SERVER_IP}/c/${displayId}`;
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

  // Filter by date (default: today)
  const filterDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(filterDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(filterDate);
  endOfDay.setHours(23, 59, 59, 999);
  where.createdAt = { gte: startOfDay, lte: endOfDay };

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

  // Get total count for the day
  const totalCount = await prisma.customer.count({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

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

  // Try cache first
  let customer = await cache.customer.get(id);

  if (!customer) {
    customer = await prisma.customer.findFirst({
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
          orderBy: { createdAt: 'desc' },
        },
        mediaFolders: true,
      },
    });

    if (customer) {
      await cache.customer.set(id, customer);
    }
  }

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: customer,
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
    waiverSigned
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
  const displayId = await generateDisplayId();
  const qrCode = await generateQRCodeDataURL(displayId);

  // Create customer
  const customer = await prisma.customer.create({
    data: {
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
      status: 'REGISTERED',
    },
  });

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

  res.status(201).json({
    success: true,
    data: {
      customer: updatedCustomer,
      qrCode,
      qrUrl: `http://${SERVER_IP}/c/${displayId}`,
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
        url: `http://${SERVER_IP}/c/${customer.displayId}`,
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

  res.json({
    success: true,
    data: {
      displayId: customer.displayId,
      firstName: customer.firstName,
      status: customer.status,
      pilot: customer.assignedPilot,
      flight: flight ? {
        status: flight.status,
        takeoffAt: flight.takeoffAt,
        landingAt: flight.landingAt,
      } : null,
      media: mediaFolder ? {
        fileCount: mediaFolder.fileCount,
        deliveryStatus: mediaFolder.deliveryStatus,
        canDownload: mediaFolder.deliveryStatus === 'PAID' || mediaFolder.deliveryStatus === 'DELIVERED',
      } : null,
    },
  });
}));

export default router;

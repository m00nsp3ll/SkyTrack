import { Router } from 'express';
import { PrismaClient, FlightStatus } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache.js';
import { sendNativeToPilot, getNotificationConfig } from '../services/firebaseNotification.js';
import { pilotQueueService } from '../services/pilotQueue.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Helper: Pilot adını NAS klasörü için güvenli formata çevir (Türkçe → ASCII)
function safePilotName(name: string): string {
  return name
    .replace(/[şŞ]/g, c => c === 'ş' ? 's' : 'S')
    .replace(/[ğĞ]/g, c => c === 'ğ' ? 'g' : 'G')
    .replace(/[üÜ]/g, c => c === 'ü' ? 'u' : 'U')
    .replace(/[öÖ]/g, c => c === 'ö' ? 'o' : 'O')
    .replace(/[ıİ]/g, c => c === 'ı' ? 'i' : 'I')
    .replace(/[çÇ]/g, c => c === 'ç' ? 'c' : 'C')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();
}

// Helper: Create media folder for completed flight — format: YYYY-MM-DD/PILOT_ADI/N_sorti/DISPLAYID
async function createMediaFolder(flight: any, customer: any, pilot: any): Promise<string | null> {
  try {
    const { qnap } = await import('../services/qnapService.js');
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeName = safePilotName(pilot.name);
    // Pilorun o günkü uçuş sayısı = sorti numarası
    const sortiNo = Math.max(1, (pilot.dailyFlightCount ?? 0) + 1);
    const relPath = `${dateStr}/${safeName}/${sortiNo}_sorti/${customer.displayId}`;

    await qnap.createFolder(relPath);

    const folderPath = `media/${relPath}`;

    await prisma.mediaFolder.upsert({
      where: { flightId: flight.id },
      create: {
        flightId: flight.id,
        customerId: customer.id,
        pilotId: pilot.id,
        folderPath,
        fileCount: 0,
        totalSizeBytes: 0,
      },
      update: { folderPath },
    });

    console.log(`[MediaFolder] Klasör oluşturuldu: ${folderPath}`);
    return folderPath;
  } catch (error) {
    console.error('Failed to create media folder:', error);
    return null;
  }
}

// GET /api/flights - List all flights with pagination, filtering, search
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const {
    status,
    pilotId,
    date,
    from,
    to,
    search,
    cursor,
    limit = '50'
  } = req.query;

  const take = Math.min(parseInt(limit as string) || 50, 100);
  const where: any = {};

  // Status filter
  if (status && status !== 'all') {
    where.status = status;
  }

  // Pilot filter
  if (pilotId) {
    where.pilotId = pilotId;
  }

  // Date range filter (from/to) — öncelikli
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const fromDate = new Date(from as string);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  } else if (date && date !== 'all') {
    // Eski API — tek gün filtresi
    const filterDate = new Date(date as string);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }
  // date === 'all' veya hiçbiri yoksa tüm tarihler

  // Search by customer name or displayId
  if (search) {
    where.OR = [
      { customer: { displayId: { contains: search as string, mode: 'insensitive' } } },
      { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  // If user is a pilot, only show their flights
  if (req.user!.role === 'PILOT' && req.user!.pilotId) {
    where.pilotId = req.user!.pilotId;
  }

  // Cursor-based pagination
  const cursorOption = cursor ? { id: cursor as string } : undefined;

  const flights = await prisma.flight.findMany({
    where,
    take: take + 1, // Get one extra to check if there's more
    skip: cursor ? 1 : 0,
    cursor: cursorOption,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          phone: true,
          weight: true,
          emergencyContact: true,
        },
      },
      pilot: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Check if there are more results
  const hasMore = flights.length > take;
  const data = hasMore ? flights.slice(0, -1) : flights;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  res.json({
    success: true,
    data,
    pagination: {
      hasMore,
      nextCursor,
      count: data.length,
    },
  });
}));

// GET /api/flights/stats/today - Today's flight statistics
router.get('/stats/today', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const flights = await prisma.flight.findMany({
    where: { createdAt: { gte: today } },
    select: {
      status: true,
      durationMinutes: true,
      createdAt: true,
      takeoffAt: true,
    },
  });

  const completed = flights.filter(f => f.status === 'COMPLETED');
  const avgDuration = completed.length > 0
    ? Math.round(completed.reduce((sum, f) => sum + (f.durationMinutes || 0), 0) / completed.length)
    : 0;

  // Calculate average wait time (createdAt to takeoffAt)
  const flightsWithTakeoff = flights.filter(f => f.takeoffAt);
  const avgWaitTime = flightsWithTakeoff.length > 0
    ? Math.round(
        flightsWithTakeoff.reduce((sum, f) => {
          const wait = f.takeoffAt!.getTime() - f.createdAt.getTime();
          return sum + wait / 60000; // Convert to minutes
        }, 0) / flightsWithTakeoff.length
      )
    : 0;

  res.json({
    success: true,
    data: {
      total: flights.length,
      completed: completed.length,
      inFlight: flights.filter(f => f.status === 'IN_FLIGHT').length,
      waiting: flights.filter(f => ['ASSIGNED', 'PICKED_UP'].includes(f.status)).length,
      cancelled: flights.filter(f => f.status === 'CANCELLED').length,
      avgDuration,
      avgWaitTime,
    },
  });
}));

// GET /api/flights/stats/hourly - Hourly flight distribution
router.get('/stats/hourly', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { date } = req.query;

  const filterDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(filterDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(filterDate);
  endOfDay.setHours(23, 59, 59, 999);

  const flights = await prisma.flight.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { not: 'CANCELLED' },
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  // Group by hour
  const hourlyData: { hour: number; count: number; completed: number }[] = [];
  for (let i = 6; i <= 20; i++) { // 06:00 to 20:00
    const hourFlights = flights.filter(f => f.createdAt.getHours() === i);
    hourlyData.push({
      hour: i,
      count: hourFlights.length,
      completed: hourFlights.filter(f => f.status === 'COMPLETED').length,
    });
  }

  res.json({
    success: true,
    data: hourlyData,
  });
}));

// GET /api/flights/live - Live flight dashboard data (enhanced)
router.get('/live', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all today's flights
  const todayFlights = await prisma.flight.findMany({
    where: {
      createdAt: { gte: today },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      takeoffAt: true,
      landingAt: true,
      durationMinutes: true,
      notes: true,
      cancellationReason: true,
      cancellationNote: true,
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          weight: true,
          emergencyContact: true,
          createdAt: true,
        },
      },
      pilot: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get all active pilots
  const pilots = await prisma.pilot.findMany({
    where: { isActive: true },
    orderBy: [
      { dailyFlightCount: 'asc' },
      { queuePosition: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      dailyFlightCount: true,
      maxDailyFlights: true,
    },
  });

  // Categorize flights (excluding cancelled for active lists)
  const activeFlights = todayFlights.filter(f => f.status !== 'CANCELLED');
  const inFlight = activeFlights.filter(f => f.status === 'IN_FLIGHT');
  const waiting = activeFlights.filter(f => ['ASSIGNED', 'PICKED_UP'].includes(f.status));
  const completed = activeFlights.filter(f => f.status === 'COMPLETED');
  const cancelled = todayFlights.filter(f => f.status === 'CANCELLED');

  // Calculate average duration
  const avgDuration = completed.length > 0
    ? Math.round(completed.reduce((sum, f) => sum + (f.durationMinutes || 0), 0) / completed.length)
    : 0;

  // Add elapsed time for in-flight
  const now = new Date();
  const inFlightWithElapsed = inFlight.map(f => ({
    ...f,
    elapsedMinutes: f.takeoffAt
      ? Math.round((now.getTime() - f.takeoffAt.getTime()) / 60000)
      : 0,
  }));

  // Add wait time for waiting customers
  const waitingWithTime = waiting.map(f => ({
    ...f,
    waitMinutes: Math.round((now.getTime() - f.createdAt.getTime()) / 60000),
  }));

  res.json({
    success: true,
    data: {
      inFlight: inFlightWithElapsed,
      waiting: waitingWithTime,
      completed,
      cancelled,
      pilots,
      stats: {
        totalToday: activeFlights.length,
        inFlightCount: inFlight.length,
        waitingCount: waiting.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        availablePilots: pilots.filter(p => p.status === 'AVAILABLE' && p.dailyFlightCount < p.maxDailyFlights).length,
        avgDuration,
      },
    },
  });
}));

// GET /api/flights/:id - Get flight by ID with full details
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const flight = await prisma.flight.findUnique({
    where: { id },
    include: {
      customer: true,
      pilot: true,
      mediaFolder: true,
    },
  });

  if (!flight) {
    throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  }

  // Get sales for this customer on same day
  const flightDate = new Date(flight.createdAt);
  flightDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(flightDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: {
      customerId: flight.customerId,
      createdAt: { gte: flightDate, lt: nextDay },
    },
  });

  // Build timeline
  const timeline = [
    { event: 'Kayıt', time: flight.createdAt, status: 'completed' },
  ];

  if (flight.pickupAt) {
    timeline.push({ event: 'Müşteri Alındı', time: flight.pickupAt, status: 'completed' });
  }
  if (flight.takeoffAt) {
    timeline.push({ event: 'Kalkış', time: flight.takeoffAt, status: 'completed' });
  }
  if (flight.landingAt) {
    timeline.push({ event: 'İniş', time: flight.landingAt, status: 'completed' });
  }
  if (flight.status === 'CANCELLED') {
    timeline.push({ event: 'İptal Edildi', time: flight.updatedAt, status: 'cancelled' });
  }

  res.json({
    success: true,
    data: {
      ...flight,
      timeline,
      sales,
    },
  });
}));

// POST /api/flights/:id/cancel - Cancel a flight
// Body: { reason: 'WEATHER' | 'CUSTOMER_CANCEL' | 'OTHER', note?: string }
// WEATHER ve CUSTOMER_CANCEL: pilot UNAVAILABLE'a düşer, queue position korunur
// OTHER: feragat mantığı (en arkaya gider, lockedUntilRound = currentRound + 1)
router.post('/:id/cancel', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { reason, note } = req.body;

  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { pilot: true, customer: true },
  });

  if (!flight) {
    throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  }

  if (flight.status === 'COMPLETED') {
    throw new AppError('Tamamlanmış uçuş iptal edilemez', 400, 'CANNOT_CANCEL_COMPLETED');
  }
  if (flight.status === 'CANCELLED') {
    throw new AppError('Uçuş zaten iptal edilmiş', 400, 'ALREADY_CANCELLED');
  }

  // Reason validation (eski API uyumluluğu için reason yoksa OTHER)
  const cancelReason = reason && ['WEATHER', 'CUSTOMER_CANCEL', 'OTHER'].includes(reason)
    ? reason
    : 'OTHER';

  // İlk iki neden: queue position korunur (pilot UNAVAILABLE'a düşer, sonra AVAILABLE olunca aynı pozisyonda)
  const preserveQueue = cancelReason === 'WEATHER' || cancelReason === 'CUSTOMER_CANCEL';

  const updatedFlight = await prisma.$transaction(async (tx) => {
    const updated = await tx.flight.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancelReason,
        cancellationNote: note || null,
        preserveQueuePosition: preserveQueue,
        notes: note ? `İptal: ${cancelReason} - ${note}` : `İptal: ${cancelReason}`,
      },
      include: { customer: true, pilot: true },
    });

    // Pilot status değişimi
    if (preserveQueue) {
      // Kötü hava / müşteri iptal: pilot UNAVAILABLE'a geçer, dailyFlightCount geri al
      await tx.pilot.update({
        where: { id: flight.pilotId },
        data: {
          status: 'UNAVAILABLE',
          dailyFlightCount: { decrement: 1 },
        },
      });
    } else {
      // Diğer (forfeit): AVAILABLE'a döndür ama feragat mantığı tetiklenir
      await tx.pilot.update({
        where: { id: flight.pilotId },
        data: { status: 'AVAILABLE', dailyFlightCount: { decrement: 1 } },
      });
    }

    await tx.customer.update({
      where: { id: flight.customerId },
      data: { status: 'CANCELLED' },
    });

    return updated;
  });

  // Eğer "Diğer" sebebiyse forfeit logic uygula
  if (!preserveQueue) {
    try {
      const { forfeitPilot } = await import('../services/roundCounter.js');
      await forfeitPilot(flight.pilotId);
    } catch (e) {
      console.error('Forfeit (cancel-other) error:', e);
    }
  }

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(flight.pilotId);
  await cache.customer.invalidate(flight.customerId);
  await cache.activeFlights.invalidate();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('flight:cancelled', {
      flight: { id: updatedFlight.id, status: 'CANCELLED' },
      pilot: { id: updatedFlight.pilot.id, name: updatedFlight.pilot.name },
      customer: {
        id: updatedFlight.customer.id,
        displayId: updatedFlight.customer.displayId,
        name: `${updatedFlight.customer.firstName} ${updatedFlight.customer.lastName}`,
      },
      reason,
    });

    // FCM: Notify pilot about cancellation
    getNotificationConfig('flight_cancelled').then(config => {
      if (config?.enabled) {
        const customerName = `${updatedFlight.customer.firstName} ${updatedFlight.customer.lastName}`;
        sendNativeToPilot(updatedFlight.pilot.id, {
          title: config.title || '❌ Uçuş İptal Edildi',
          body: config.body ? config.body.replace('{customer}', customerName).replace('{displayId}', updatedFlight.customer.displayId) : `${customerName} (${updatedFlight.customer.displayId})`,
          data: { type: 'flight_cancelled', flightId: id },
        }).catch(err => console.error('FCM cancel notification error:', err));
      }
    });
  }

  res.json({
    success: true,
    data: updatedFlight,
    message: 'Uçuş iptal edildi',
  });
}));

// POST /api/flights/:id/forfeit-reassign - Pilot feragat eder, müşteri sıradaki pilota geçer
router.post('/:id/forfeit-reassign', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { customer: true, pilot: true },
  });
  if (!flight) throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  if (flight.status === 'COMPLETED' || flight.status === 'CANCELLED') {
    throw new AppError('Bu uçuş zaten tamamlanmış veya iptal edilmiş', 400, 'INVALID_STATUS');
  }

  // 1. Mevcut uçuşu iptal et + pilot feragat et
  await prisma.$transaction(async (tx) => {
    await tx.flight.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'OTHER',
        cancellationNote: 'Admin feragat — müşteri sıradaki pilota geçti',
      },
    });
    await tx.pilot.update({
      where: { id: flight.pilotId },
      data: { status: 'AVAILABLE', dailyFlightCount: { decrement: 1 } },
    });
    await tx.customer.update({
      where: { id: flight.customerId },
      data: { status: 'REGISTERED', assignedPilotId: null },
    });
  });

  const { forfeitPilot } = await import('../services/roundCounter.js');
  await forfeitPilot(flight.pilotId);

  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(flight.pilotId);
  await cache.customer.invalidate(flight.customerId);
  await cache.activeFlights.invalidate();

  // 2. Müşteriyi sıradaki pilota ata
  const io = req.app.get('io');
  const result = await pilotQueueService.assignPilotToCustomer(
    flight.customerId,
    flight.customer.displayId,
    io,
  );

  if (!result) {
    return res.json({
      success: true,
      message: 'Pilot feragat etti — şu an müsait pilot yok, müşteri kuyrukta',
      reassigned: false,
    });
  }

  res.json({
    success: true,
    message: `Pilot feragat etti — müşteri ${result.pilot.name} pilotuna atandı`,
    reassigned: true,
    newPilot: { id: result.pilot.id, name: result.pilot.name },
  });
}));

// POST /api/flights/bulk-cancel - Bulk cancel flights (admin only)
router.post('/bulk-cancel', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { reason } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all waiting flights (ASSIGNED or PICKED_UP)
  const waitingFlights = await prisma.flight.findMany({
    where: {
      createdAt: { gte: today },
      status: { in: ['ASSIGNED', 'PICKED_UP'] },
    },
    include: { pilot: true, customer: true },
  });

  if (waitingFlights.length === 0) {
    return res.json({
      success: true,
      data: [],
      message: 'İptal edilecek bekleyen uçuş yok',
    });
  }

  // Cancel all waiting flights
  const cancelledIds = waitingFlights.map(f => f.id);

  await prisma.$transaction(async (tx) => {
    // Update all flights
    await tx.flight.updateMany({
      where: { id: { in: cancelledIds } },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Toplu iptal: ${reason}` : 'Toplu iptal (hava muhalefeti)',
      },
    });

    // Update all customers
    const customerIds = waitingFlights.map(f => f.customerId);
    await tx.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { status: 'CANCELLED' },
    });

    // Set all affected pilots to available
    const pilotIds = [...new Set(waitingFlights.map(f => f.pilotId))];
    await tx.pilot.updateMany({
      where: { id: { in: pilotIds } },
      data: { status: 'AVAILABLE' },
    });
  });

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.activeFlights.invalidate();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('flights:bulk-cancelled', {
      count: cancelledIds.length,
      reason,
    });
  }

  res.json({
    success: true,
    data: { cancelledCount: cancelledIds.length },
    message: `${cancelledIds.length} uçuş iptal edildi`,
  });
}));

// POST /api/flights/:id/reassign - Reassign pilot to a flight
router.post('/:id/reassign', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { pilotId } = req.body;

  if (!pilotId) {
    throw new AppError('Pilot ID gerekli', 400, 'PILOT_ID_REQUIRED');
  }

  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { pilot: true, customer: true },
  });

  if (!flight) {
    throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  }

  // Can only reassign before takeoff
  if (['IN_FLIGHT', 'COMPLETED', 'CANCELLED'].includes(flight.status)) {
    throw new AppError('Bu aşamada pilot değiştirilemez', 400, 'CANNOT_REASSIGN');
  }

  const newPilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
  });

  if (!newPilot) {
    throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
  }

  if (!newPilot.isActive) {
    throw new AppError('Pilot aktif değil', 400, 'PILOT_INACTIVE');
  }

  if (newPilot.dailyFlightCount >= newPilot.maxDailyFlights) {
    throw new AppError('Pilot günlük limitine ulaşmış', 400, 'PILOT_AT_LIMIT');
  }

  const oldPilotId = flight.pilotId;

  // Update flight with new pilot
  const updatedFlight = await prisma.flight.update({
    where: { id },
    data: { pilotId },
    include: { customer: true, pilot: true, mediaFolder: true },
  });

  // NAS'ta eski klasörü sil, yeni pilotun sortisinde yeni klasör aç
  if ((updatedFlight as any).mediaFolder) {
    try {
      const mediaFolder = (updatedFlight as any).mediaFolder;
      const oldPath = mediaFolder.folderPath.replace(/^media\//, '');
      const dateMatch = oldPath.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const safeName = safePilotName(newPilot.name);
        // Yeni pilotun güncel sorti numarası: tamamlanan uçuş sayısı + 1 (en az 1)
        const sortiNo = Math.max(1, (newPilot.dailyFlightCount ?? 0) + 1);
        const newRelPath = `${dateStr}/${safeName}/${sortiNo}_sorti/${updatedFlight.customer.displayId}`;
        const { qnap } = await import('../services/qnapService.js');
        // Eski klasörü yeni konuma taşı (içinde dosya varsa koru)
        const moved = await qnap.moveFolder(oldPath, newRelPath);
        if (moved) {
          await prisma.mediaFolder.update({
            where: { id: mediaFolder.id },
            data: { folderPath: `media/${newRelPath}`, pilotId },
          });
          console.log(`[Reassign] NAS klasör taşındı: ${oldPath} → ${newRelPath}`);
        } else {
          // Taşıma başarısız olsa bile DB'yi güncelle ve yeni klasör oluştur
          await qnap.createFolder(newRelPath);
          await prisma.mediaFolder.update({
            where: { id: mediaFolder.id },
            data: { folderPath: `media/${newRelPath}`, pilotId },
          });
          console.log(`[Reassign] Yeni klasör oluşturuldu: ${newRelPath}`);
        }
      }
    } catch (err: any) { console.error('[Reassign] NAS klasör taşıma hatası:', err?.message); }
  }

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(oldPilotId);
  await cache.pilot.invalidate(pilotId);
  await cache.activeFlights.invalidate();

  // Emit socket events
  const io = req.app.get('io');
  if (io) {
    // Notify old pilot
    io.to(`pilot:${oldPilotId}`).emit('flight:reassigned', {
      message: 'Müşteri başka pilota aktarıldı',
      flightId: id,
    });

    // Notify new pilot
    io.to(`pilot:${pilotId}`).emit('customer:assigned', {
      flight: { id: updatedFlight.id, status: updatedFlight.status },
      customer: {
        id: updatedFlight.customer.id,
        displayId: updatedFlight.customer.displayId,
        firstName: updatedFlight.customer.firstName,
        lastName: updatedFlight.customer.lastName,
        phone: updatedFlight.customer.phone,
        weight: updatedFlight.customer.weight,
      },
      pilot: { id: newPilot.id, name: newPilot.name },
    });

    // FCM: Notify new pilot about reassignment
    getNotificationConfig('customer_reassigned').then(config => {
      if (config?.enabled) {
        const customerName = `${updatedFlight.customer.firstName} ${updatedFlight.customer.lastName}`;
        sendNativeToPilot(newPilot.id, {
          title: config.title || '🪂 Yeni Müşteri Atandı',
          body: config.body ? config.body.replace('{customer}', customerName).replace('{displayId}', updatedFlight.customer.displayId) : `${customerName} (${updatedFlight.customer.displayId})`,
          data: { type: 'customer_reassigned', flightId: id },
        }).catch(err => console.error('FCM reassign notification error:', err));
      }
    });

    // Notify admin
    io.to('admin').emit('flight:reassigned', {
      flightId: id,
      oldPilotId,
      newPilotId: pilotId,
      newPilotName: newPilot.name,
    });
  }

  res.json({
    success: true,
    data: updatedFlight,
    message: `Uçuş ${newPilot.name} pilotuna aktarıldı`,
  });
}));

// PATCH /api/flights/:id/status - Update flight status (pilot action buttons)
router.patch('/:id/status', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses: FlightStatus[] = ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT', 'COMPLETED', 'CANCELLED'];

  if (!status || !validStatuses.includes(status)) {
    throw new AppError('Geçersiz durum', 400, 'INVALID_STATUS');
  }

  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { pilot: true, customer: true },
  });

  if (!flight) {
    throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  }

  // Check if pilot is authorized
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== flight.pilotId) {
    throw new AppError('Bu uçuşu güncelleme yetkiniz yok', 403, 'FORBIDDEN');
  }

  // Validate status transitions (no going back)
  const validTransitions: Record<string, string[]> = {
    ASSIGNED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['IN_FLIGHT', 'CANCELLED'],
    IN_FLIGHT: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!validTransitions[flight.status]?.includes(status)) {
    throw new AppError(`${flight.status} durumundan ${status} durumuna geçilemez`, 400, 'INVALID_TRANSITION');
  }

  // Prepare update data based on status
  const updateData: any = { status };
  const now = new Date();

  if (notes) {
    updateData.notes = notes;
  }

  switch (status) {
    case 'PICKED_UP':
      updateData.pickupAt = now;
      break;
    case 'IN_FLIGHT':
      updateData.takeoffAt = now;
      break;
    case 'COMPLETED':
      updateData.landingAt = now;
      if (flight.takeoffAt) {
        updateData.durationMinutes = Math.round(
          (now.getTime() - flight.takeoffAt.getTime()) / 60000
        );
      }
      break;
  }

  // Transaction to update flight, pilot, and customer
  const updatedFlight = await prisma.$transaction(async (tx) => {
    // Update flight
    const updated = await tx.flight.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        pilot: true,
      },
    });

    // Update pilot status and counters based on flight status
    if (status === 'PICKED_UP') {
      await tx.pilot.update({
        where: { id: flight.pilotId },
        data: { status: 'PICKED_UP' },
      });

      await tx.customer.update({
        where: { id: flight.customerId },
        data: { status: 'ASSIGNED' },
      });
    } else if (status === 'IN_FLIGHT') {
      await tx.pilot.update({
        where: { id: flight.pilotId },
        data: { status: 'IN_FLIGHT' },
      });

      await tx.customer.update({
        where: { id: flight.customerId },
        data: { status: 'IN_FLIGHT' },
      });
    } else if (status === 'COMPLETED') {
      // dailyFlightCount is already incremented during assignment (assignPilotToCustomer)
      // Only update status here — check current count against limit
      const pilotForLimit = await tx.pilot.findUnique({ where: { id: flight.pilotId } });
      const currentCount = pilotForLimit?.dailyFlightCount ?? 0;
      const limitReached = currentCount >= (pilotForLimit?.maxDailyFlights ?? 7);
      await tx.pilot.update({
        where: { id: flight.pilotId },
        data: {
          status: limitReached ? 'OFF_DUTY' : 'AVAILABLE',
        },
      });

      await tx.customer.update({
        where: { id: flight.customerId },
        data: { status: 'COMPLETED' },
      });
    }

    return updated;
  });

  // Create media folder on completion
  if (status === 'COMPLETED') {
    await createMediaFolder(updatedFlight, updatedFlight.customer, updatedFlight.pilot);
  }

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(flight.pilotId);
  await cache.customer.invalidate(flight.customerId);
  await cache.activeFlights.invalidate();

  // Emit socket events
  const io = req.app.get('io');
  if (io) {
    const eventMap: Record<string, string> = {
      PICKED_UP: 'flight:pickup',
      IN_FLIGHT: 'flight:takeoff',
      COMPLETED: 'flight:landed',
      CANCELLED: 'flight:cancelled',
    };

    const event = eventMap[status];
    if (event) {
      const eventData = {
        flight: {
          id: updatedFlight.id,
          status: updatedFlight.status,
          durationMinutes: updatedFlight.durationMinutes,
        },
        pilot: {
          id: updatedFlight.pilot.id,
          name: updatedFlight.pilot.name,
        },
        customer: {
          id: updatedFlight.customer.id,
          displayId: updatedFlight.customer.displayId,
          name: `${updatedFlight.customer.firstName} ${updatedFlight.customer.lastName}`,
        },
      };

      // Notify admin
      io.to('admin').emit(event, eventData);

      // Notify pilot
      io.to(`pilot:${flight.pilotId}`).emit(event, eventData);

      // Send FCM notifications based on status
      if (status === 'PICKED_UP') {
        // FCM to admin: Customer picked up
        // (Pilot already knows - they triggered the action)
      } else if (status === 'IN_FLIGHT') {
        // FCM to admin: Flight started
        // (Pilot already knows - they triggered the action)
      } else if (status === 'COMPLETED') {
        // Pilot triggered this action — no FCM notification needed
      }

      // Check if pilot is approaching/reached limit
      if (status === 'COMPLETED') {
        const pilot = await prisma.pilot.findUnique({
          where: { id: flight.pilotId },
        });

        if (pilot) {
          if (pilot.dailyFlightCount === pilot.maxDailyFlights - 1) {
            io.to(`pilot:${flight.pilotId}`).emit('pilot:limit-warning', {
              message: `Günlük uçuş limitine yaklaştınız: ${pilot.dailyFlightCount + 1}/${pilot.maxDailyFlights}`,
            });

            // FCM: Limit warning
            getNotificationConfig('pilot_limit_warning').then(config => {
              if (config?.enabled) {
                const defaultBody = `Günlük uçuş limitine yaklaştınız: ${pilot.dailyFlightCount + 1}/${pilot.maxDailyFlights}`;
                sendNativeToPilot(pilot.id, {
                  title: config.title || '⚠️ Limit Uyarısı',
                  body: config.body ? config.body.replace('{current}', String(pilot.dailyFlightCount + 1)).replace('{max}', String(pilot.maxDailyFlights)) : defaultBody,
                  data: { type: 'pilot_limit_warning' },
                }).catch(err => console.error('FCM limit warning error:', err));
              }
            });
          } else if (pilot.dailyFlightCount >= pilot.maxDailyFlights) {
            io.to(`pilot:${flight.pilotId}`).emit('pilot:limit-reached', {
              message: `Günlük uçuş limitine ulaştınız: ${pilot.maxDailyFlights}/${pilot.maxDailyFlights} - Bugünlük sıra dışısınız`,
            });

            // FCM: Limit reached
            getNotificationConfig('pilot_limit_reached').then(config => {
              if (config?.enabled) {
                const defaultBody = `${pilot.maxDailyFlights}/${pilot.maxDailyFlights} uçuş tamamlandı. Bugünlük sıra dışısınız.`;
                sendNativeToPilot(pilot.id, {
                  title: config.title || '🛑 Günlük Limit Doldu',
                  body: config.body ? config.body.replace('{current}', String(pilot.maxDailyFlights)).replace('{max}', String(pilot.maxDailyFlights)) : defaultBody,
                  data: { type: 'pilot_limit_reached' },
                }).catch(err => console.error('FCM limit reached error:', err));
              }
            });

            // Notify admin about pilot reaching limit
            io.to('admin').emit('pilot:limit-reached', {
              pilotId: pilot.id,
              pilotName: pilot.name,
              message: `${pilot.name} günlük uçuş limitine ulaştı`,
            });
          }
        }
      }
    }
  }

  res.json({
    success: true,
    data: updatedFlight,
  });
}));

// POST /api/flights/:id/notes - Add notes to flight
router.post('/:id/notes', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { notes } = req.body;

  const flight = await prisma.flight.findUnique({
    where: { id },
  });

  if (!flight) {
    throw new AppError('Uçuş bulunamadı', 404, 'FLIGHT_NOT_FOUND');
  }

  // Check if pilot is authorized
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== flight.pilotId) {
    throw new AppError('Bu uçuşu güncelleme yetkiniz yok', 403, 'FORBIDDEN');
  }

  const updatedFlight = await prisma.flight.update({
    where: { id },
    data: { notes },
  });

  res.json({
    success: true,
    data: updatedFlight,
  });
}));

export default router;

import { Router } from 'express';
import { PrismaClient, PilotStatus } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/pilots - List all pilots
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const pilots = await prisma.pilot.findMany({
    orderBy: [
      { queuePosition: 'asc' }, // ONLY queue position, not flight count
    ],
    include: {
      _count: {
        select: { flights: true },
      },
      user: {
        select: { id: true, username: true },
      },
    },
  });

  res.json({
    success: true,
    data: pilots,
  });
}));

// GET /api/pilots/queue - Get current pilot queue status
router.get('/queue', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  // Try cache first
  let queueData = await cache.pilotQueue.get();

  if (!queueData) {
    const pilots = await prisma.pilot.findMany({
      where: { isActive: true },
      orderBy: [
        { queuePosition: 'asc' }, // ONLY queue position, round-robin
      ],
      select: {
        id: true,
        name: true,
        dailyFlightCount: true,
        maxDailyFlights: true,
        status: true,
        queuePosition: true,
        inQueue: true,
        phone: true,
      },
    });

    queueData = pilots;
    await cache.pilotQueue.set(pilots);
  }

  const availablePilots = (queueData as any[]).filter(
    (p: any) => p.inQueue !== false && p.status === 'AVAILABLE' && p.dailyFlightCount < p.maxDailyFlights
  );

  res.json({
    success: true,
    data: {
      queue: queueData,
      nextPilot: availablePilots[0] || null,
      availableCount: availablePilots.length,
      totalActive: (queueData as any[]).length,
    },
  });
}));

// POST /api/pilots/queue/reorder - Reorder pilot queue (admin only)
router.post('/queue/reorder', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { order } = req.body; // Array of { id: string, position: number }

  if (!Array.isArray(order)) {
    throw new AppError('Geçersiz sıralama verisi', 400, 'INVALID_ORDER');
  }

  // Update each pilot's queue position
  await prisma.$transaction(
    order.map((item: { id: string; position: number }) =>
      prisma.pilot.update({
        where: { id: item.id },
        data: { queuePosition: item.position },
      })
    )
  );

  // Invalidate cache
  await cache.pilotQueue.invalidate();

  res.json({
    success: true,
    message: 'Pilot sırası güncellendi',
  });
}));

// GET /api/pilots/:id - Get pilot by ID with optional date filter
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { from, to } = req.query;

  const pilot = await prisma.pilot.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, username: true },
      },
      _count: {
        select: { flights: true },
      },
    },
  });

  if (!pilot) {
    throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
  }

  // Date filter for flights
  let dateFilter: any = {};

  if (from && to) {
    const fromDate = new Date(from as string);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to as string);
    toDate.setHours(23, 59, 59, 999);
    dateFilter = { createdAt: { gte: fromDate, lte: toDate } };
  } else if (from) {
    const fromDate = new Date(from as string);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(from as string);
    toDate.setHours(23, 59, 59, 999);
    dateFilter = { createdAt: { gte: fromDate, lte: toDate } };
  } else {
    // Default: today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { gte: today } };
  }

  // Get filtered flights
  const filteredFlights = await prisma.flight.findMany({
    where: {
      pilotId: id,
      ...dateFilter,
    },
    include: {
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          weight: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get all-time stats
  const allTimeStats = await prisma.flight.groupBy({
    by: ['status'],
    where: { pilotId: id },
    _count: true,
  });

  const totalFlights = allTimeStats.reduce((sum, s) => sum + s._count, 0);
  const completedAllTime = allTimeStats.find(s => s.status === 'COMPLETED')?._count || 0;

  // Get today's flights for daily counter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayFlights = await prisma.flight.findMany({
    where: {
      pilotId: id,
      createdAt: { gte: today },
    },
    include: {
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          weight: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: {
      ...pilot,
      totalFlights,
      completedAllTime,
      todayFlights,
      filteredFlights,
      todayStats: {
        total: todayFlights.length,
        completed: todayFlights.filter(f => f.status === 'COMPLETED').length,
        inProgress: todayFlights.filter(f => ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT'].includes(f.status)).length,
      },
      filteredStats: {
        total: filteredFlights.length,
        completed: filteredFlights.filter(f => f.status === 'COMPLETED').length,
        inProgress: filteredFlights.filter(f => ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT'].includes(f.status)).length,
        cancelled: filteredFlights.filter(f => f.status === 'CANCELLED').length,
      },
    },
  });
}));

// GET /api/pilots/:id/panel - Pilot panel data (for pilot's own mobile view)
router.get('/:id/panel', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Pilots can only view their own panel
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== id) {
    throw new AppError('Bu panele erişim yetkiniz yok', 403, 'FORBIDDEN');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      dailyFlightCount: true,
      maxDailyFlights: true,
      queuePosition: true,
    },
  });

  if (!pilot) {
    throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
  }

  // Get today's flights
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Active flights: no date filter — a reassigned flight may have been created yesterday
  const activeFlights = await prisma.flight.findMany({
    where: {
      pilotId: id,
      status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_FLIGHT'] },
    },
    include: {
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          phone: true,
          weight: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Completed flights: only today (for daily stats)
  const completedFlights = await prisma.flight.findMany({
    where: {
      pilotId: id,
      status: 'COMPLETED',
      createdAt: { gte: today },
    },
    include: {
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          phone: true,
          weight: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate ACTUAL completed flight count for today
  const actualDailyFlightCount = completedFlights.length;

  // Calculate DYNAMIC queue position among available pilots
  const allActivePilots = await prisma.pilot.findMany({
    where: {
      isActive: true,
      status: { in: ['AVAILABLE', 'ON_BREAK'] },
    },
    orderBy: [
      { queuePosition: 'asc' }, // ONLY queue position
    ],
    select: {
      id: true,
      dailyFlightCount: true,
      maxDailyFlights: true,
    },
  });

  // Find this pilot's position in the queue (1-indexed)
  let dynamicQueuePosition = 0;
  const eligiblePilots = allActivePilots.filter(p => p.dailyFlightCount < p.maxDailyFlights);
  const positionIndex = eligiblePilots.findIndex(p => p.id === id);
  if (positionIndex !== -1) {
    dynamicQueuePosition = positionIndex + 1;
  }

  // If dailyFlightCount is out of sync, update it
  if (pilot.dailyFlightCount !== actualDailyFlightCount) {
    await prisma.pilot.update({
      where: { id },
      data: { dailyFlightCount: actualDailyFlightCount },
    });
    // Invalidate cache
    await cache.pilotQueue.invalidate();
  }

  res.json({
    success: true,
    data: {
      pilot: {
        ...pilot,
        dailyFlightCount: actualDailyFlightCount,
        queuePosition: dynamicQueuePosition,
      },
      activeFlights,
      completedFlights,
      stats: {
        completed: completedFlights.length,
        remaining: pilot.maxDailyFlights - actualDailyFlightCount,
        inQueue: activeFlights.length,
      },
    },
  });
}));

// POST /api/pilots - Create new pilot (admin only)
router.post('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { name, phone, email, maxDailyFlights } = req.body;

  if (!name || !phone) {
    throw new AppError('İsim ve telefon gerekli', 400, 'MISSING_FIELDS');
  }

  // Get next queue position
  const lastPilot = await prisma.pilot.findFirst({
    orderBy: { queuePosition: 'desc' },
  });

  const queuePosition = (lastPilot?.queuePosition || 0) + 1;

  const pilot = await prisma.pilot.create({
    data: {
      name,
      phone,
      email,
      maxDailyFlights: maxDailyFlights || 7,
      queuePosition,
      isActive: true,
      status: 'AVAILABLE',
    },
  });

  // Invalidate cache
  await cache.pilotQueue.invalidate();

  res.status(201).json({
    success: true,
    data: pilot,
  });
}));

// PUT /api/pilots/:id - Update pilot (admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { name, phone, email, isActive, maxDailyFlights, queuePosition } = req.body;

  const pilot = await prisma.pilot.update({
    where: { id },
    data: {
      name,
      phone,
      email,
      isActive,
      maxDailyFlights,
      queuePosition,
    },
  });

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  res.json({
    success: true,
    data: pilot,
  });
}));

// PATCH /api/pilots/:id/queue-toggle - Pilotu sıraya al/çıkar (admin only)
router.patch('/:id/queue-toggle', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const current = await prisma.pilot.findUnique({ where: { id }, select: { inQueue: true } });
  if (!current) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');

  const pilot = await prisma.pilot.update({
    where: { id },
    data: { inQueue: !current.inQueue },
  });

  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  res.json({ success: true, data: pilot, message: pilot.inQueue ? 'Pilot sıraya alındı' : 'Pilot sıradan çıkarıldı' });
}));

// PATCH /api/pilots/:id/status - Update pilot status
router.patch('/:id/status', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { status } = req.body;

  // Pilots can only update their own status
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== id) {
    throw new AppError('Sadece kendi durumunuzu değiştirebilirsiniz', 403, 'FORBIDDEN');
  }

  const validStatuses: PilotStatus[] = ['AVAILABLE', 'IN_FLIGHT', 'ON_BREAK', 'OFF_DUTY'];

  if (!status || !validStatuses.includes(status)) {
    throw new AppError('Geçersiz durum', 400, 'INVALID_STATUS');
  }

  // Pilots cannot set themselves to IN_FLIGHT directly (that's done via flight status)
  if (req.user!.role === 'PILOT' && status === 'IN_FLIGHT') {
    throw new AppError('Bu durum uçuş sırasında otomatik ayarlanır', 400, 'INVALID_STATUS_CHANGE');
  }

  const pilot = await prisma.pilot.update({
    where: { id },
    data: { status },
  });

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('pilot:status-changed', {
      pilotId: id,
      pilotName: pilot.name,
      status,
    });
  }

  res.json({
    success: true,
    data: pilot,
  });
}));

// DELETE /api/pilots/:id - Delete pilot (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Check if pilot has any flights
  const flightCount = await prisma.flight.count({
    where: { pilotId: id },
  });

  if (flightCount > 0) {
    // Soft delete - just deactivate
    await prisma.pilot.update({
      where: { id },
      data: { isActive: false, status: 'OFF_DUTY' },
    });

    return res.json({
      success: true,
      message: 'Pilot pasife alındı (uçuş geçmişi korundu)',
    });
  }

  await prisma.pilot.delete({
    where: { id },
  });

  // Invalidate cache
  await cache.pilotQueue.invalidate();

  res.json({
    success: true,
    message: 'Pilot silindi',
  });
}));

export default router;

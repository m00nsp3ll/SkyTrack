import { Router } from 'express';
import { PrismaClient, PilotStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache.js';
import { pilotQueueService } from '../services/pilotQueue.js';

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
  // Always fetch fresh data — cache causes stale queue on real-time updates
  const pilots = await prisma.pilot.findMany({
    where: { isActive: true },
    orderBy: [{ priorityOverride: 'desc' }, { roundCount: 'asc' }, { queuePosition: 'asc' }],
    select: {
      id: true,
      name: true,
      dailyFlightCount: true,
      maxDailyFlights: true,
      status: true,
      queuePosition: true,
      roundCount: true,
      priorityOverride: true,
      inQueue: true,
      isInExcel: true,
      phone: true,
    },
  });

  const availablePilots = pilots.filter(
    (p: any) => p.inQueue !== false && p.status === 'AVAILABLE' && p.dailyFlightCount < p.maxDailyFlights
  );

  res.json({
    success: true,
    data: {
      queue: pilots,
      nextPilot: availablePilots[0] || null,
      availableCount: availablePilots.length,
      totalActive: pilots.length,
    },
  });
}));

// PATCH /api/pilots/:id/priority-override - Toggle priority override (admin only)
router.patch('/:id/priority-override', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const pilot = await prisma.pilot.findUnique({ where: { id } });
  if (!pilot) {
    throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
  }

  const newValue = typeof enabled === 'boolean' ? enabled : !pilot.priorityOverride;

  await prisma.pilot.update({
    where: { id },
    data: { priorityOverride: newValue },
  });

  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  const io = req.app.get('io');
  if (io) {
    io.emit('pilot:queue-updated');
  }

  res.json({
    success: true,
    data: { id, priorityOverride: newValue },
    message: newValue ? 'Pilot ilk sıraya alındı' : 'Öncelik kaldırıldı',
  });
}));

// POST /api/pilots/queue/reorder - DEVRE DIŞI: queue_position sabit Excel forma numarası
router.post('/queue/reorder', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  throw new AppError('Sıra pozisyonu sabittir (Excel forma numarası). Manuel sıralama devre dışı.', 403, 'REORDER_DISABLED');

  // ESKİ KOD — devre dışı bırakıldı
  /* const { order } = req.body;

  if (!Array.isArray(order)) {
    throw new AppError('Geçersiz sıralama verisi', 400, 'INVALID_ORDER');
  }

  await prisma.$transaction(
    order.map((item: { id: string; position: number }) =>
      prisma.pilot.update({
        where: { id: item.id },
        data: { queuePosition: item.position },
      })
    )
  ); */

  // Invalidate cache
  await cache.pilotQueue.invalidate();

  // Notify all pilots so queue modal updates in real-time
  const io = req.app.get('io');
  if (io) {
    io.emit('pilot:queue-updated');
  }

  res.json({
    success: true,
    message: 'Pilot sırası güncellendi',
  });
}));

// GET /api/pilots/registration-stats - Aggregate stats for self-registration + app installs
// NOTE: must be declared BEFORE /:id routes so Express doesn't treat "registration-stats" as an id
router.get('/registration-stats', authenticate, requireRole('ADMIN'), asyncHandler(async (_req: AuthRequest, res: any) => {
  const [total, appInstalled, notInstalled] = await Promise.all([
    prisma.pilot.count(),
    prisma.pilot.count({ where: { appInstalled: true } }),
    prisma.pilot.count({ where: { appInstalled: false } }),
  ]);
  const pilots = await prisma.pilot.findMany({
    select: { id: true, name: true, phone: true, appInstalled: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    success: true,
    data: { total, appInstalled, notInstalled, pilots },
  });
}));

// POST /api/pilots/public-register - Public endpoint for pilot self-registration
// Token-protected: requires PILOT_REGISTRATION_TOKEN env match
// NOTE: must be declared BEFORE /:id routes
router.post('/public-register', asyncHandler(async (req: any, res: any) => {
  const expectedToken = process.env.PILOT_REGISTRATION_TOKEN;
  if (!expectedToken) {
    throw new AppError('Pilot kayıt kapalı', 503, 'REGISTRATION_DISABLED');
  }

  const providedToken = (req.query.token as string) || (req.body.token as string) || req.get('x-pilot-registration-token');
  if (providedToken !== expectedToken) {
    throw new AppError('Geçersiz kayıt bağlantısı', 403, 'INVALID_TOKEN');
  }

  const { name, phone, email, username, password, appInstalled } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    throw new AppError('Ad Soyad en az 3 karakter olmalı', 400, 'INVALID_NAME');
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    throw new AppError('Geçerli bir telefon numarası girin', 400, 'INVALID_PHONE');
  }
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new AppError('Kullanıcı adı en az 3 karakter olmalı', 400, 'INVALID_USERNAME');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
    throw new AppError('Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir', 400, 'INVALID_USERNAME_CHARS');
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    throw new AppError('Şifre en az 4 karakter olmalı', 400, 'INVALID_PASSWORD');
  }

  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;
  const cleanUsername = username.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUser) {
    throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 409, 'USERNAME_TAKEN');
  }

  const maxPos = await prisma.pilot.aggregate({ _max: { queuePosition: true } });
  const nextPos = (maxPos._max.queuePosition || 0) + 1;

  const pilot = await prisma.pilot.create({
    data: {
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      queuePosition: nextPos,
      isActive: true,
      inQueue: true,
      status: 'AVAILABLE',
      appInstalled: appInstalled === true,
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username: cleanUsername,
      name: cleanName,
      passwordHash,
      plainPassword: password,
      role: 'PILOT',
      pilotId: pilot.id,
      isActive: true,
    },
  });

  await cache.pilotQueue.invalidate();

  res.json({
    success: true,
    data: { name: cleanName, username: cleanUsername, message: 'Kayıt başarılı' },
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
      inQueue: true,
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

  // Bugün iptal olan uçuşlar (müşteri iptal — pilotun panelinde gösterilecek)
  const cancelledFlightsToday = await prisma.flight.findMany({
    where: {
      pilotId: id,
      status: 'CANCELLED',
      cancellationReason: { not: 'FORFEIT' },
      createdAt: { gte: today },
    },
    include: {
      customer: {
        select: {
          id: true, displayId: true, firstName: true, lastName: true,
          phone: true, weight: true, createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  // Calculate DYNAMIC queue position: all inQueue=true pilots, status independent
  // ON_BREAK / OFF_DUTY pilots keep their spot but won't receive customers until AVAILABLE
  const allQueuedPilots = await prisma.pilot.findMany({
    where: {
      isActive: true,
      inQueue: true,
    },
    orderBy: [{ roundCount: 'asc' }, { queuePosition: 'asc' }],
    select: {
      id: true,
      dailyFlightCount: true,
      maxDailyFlights: true,
      status: true,
      lockedUntilRound: true,
      roundCount: true,
    },
  });

  // Atama mantığıyla aynı: AVAILABLE + günlük limit altı + kilit yok = sırada
  const { getCurrentRound } = await import('../services/roundCounter.js');
  const currentRound = await getCurrentRound();

  let dynamicQueuePosition = 0;
  if (pilot.status === 'AVAILABLE') {
    const eligiblePilots = allQueuedPilots.filter(p =>
      p.status === 'AVAILABLE' &&
      p.dailyFlightCount < p.maxDailyFlights &&
      (p.lockedUntilRound === null || currentRound >= p.lockedUntilRound)
    );
    const positionIndex = eligiblePilots.findIndex(p => p.id === id);
    if (positionIndex !== -1) {
      dynamicQueuePosition = positionIndex + 1;
    }
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
      cancelledFlightsToday,
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

  // Get next queue position and max round count for fair start
  const [lastPositionPilot, maxRoundPilot] = await Promise.all([
    prisma.pilot.findFirst({ orderBy: { queuePosition: 'desc' } }),
    prisma.pilot.findFirst({ orderBy: { roundCount: 'desc' } }),
  ]);

  const queuePosition = (lastPositionPilot?.queuePosition || 0) + 1;
  const maxRoundCount = maxRoundPilot?.roundCount || 0;

  const pilot = await prisma.pilot.create({
    data: {
      name,
      phone,
      email,
      maxDailyFlights: maxDailyFlights || 7,
      queuePosition,
      roundCount: maxRoundCount,
      forfeitCount: maxRoundCount,
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
  const { name, phone, email, isActive, maxDailyFlights, queuePosition, isFemale } = req.body;

  const pilot = await prisma.pilot.update({
    where: { id },
    data: {
      name,
      phone,
      email,
      isActive,
      isFemale: isFemale ?? undefined,
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

  // Notify all pilots so queue modal updates in real-time
  const io = req.app.get('io');
  if (io) io.emit('pilot:queue-updated');

  res.json({ success: true, data: pilot, message: pilot.inQueue ? 'Pilot sıraya alındı' : 'Pilot sıradan çıkarıldı' });
}));

// PATCH /api/pilots/:id/status - Update pilot status
router.patch('/:id/status', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { status, priorityOverride } = req.body;

  // Pilots can only update their own status
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== id) {
    throw new AppError('Sadece kendi durumunuzu değiştirebilirsiniz', 403, 'FORBIDDEN');
  }

  const validStatuses: PilotStatus[] = ['AVAILABLE', 'IN_FLIGHT', 'ON_BREAK', 'OFF_DUTY', 'UNAVAILABLE'];

  if (!status || !validStatuses.includes(status)) {
    throw new AppError('Geçersiz durum', 400, 'INVALID_STATUS');
  }

  // Pilots cannot set themselves to IN_FLIGHT directly (that's done via flight status)
  if (req.user!.role === 'PILOT' && status === 'IN_FLIGHT') {
    throw new AppError('Bu durum uçuş sırasında otomatik ayarlanır', 400, 'INVALID_STATUS_CHANGE');
  }

  // OFF_DUTY/ON_BREAK → AVAILABLE: sadece status değiştir, konum aynı kalsın
  // Mesai dışındayken sıra geçerse, müşteri geldiğinde otomatik feragat alır (pilotQueue.ts)
  const updateData: any = { status };
  if (priorityOverride !== undefined) updateData.priorityOverride = priorityOverride;
  const pilot = await prisma.pilot.update({
    where: { id },
    data: updateData,
  });

  // Invalidate caches
  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('pilot:status-changed', { pilotId: id, pilotName: pilot?.name, status });
    io.emit('pilot:queue-updated'); // tüm pilotlara — queue modal anlık güncellenir
  }

  res.json({
    success: true,
    data: pilot,
  });
}));

// POST /api/pilots/me/forfeit - Pilot kendisi feragat eder
// ÖNEMLİ: Bu /:id/forfeit'ten önce tanımlanmalı ki route eşleşmesinde öncelik alsın
router.post('/me/forfeit', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) {
    throw new AppError('Sadece pilotlar feragat edebilir', 403, 'NOT_PILOT');
  }
  const pilotId = req.user.pilotId;

  // Aktif uçuş varsa: müşteriyi sonraki pilota taşı (admin feragat mantığı)
  const activeFlight = await prisma.flight.findFirst({
    where: { pilotId, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
    include: { customer: true },
  });

  const io = req.app.get('io');

  if (activeFlight) {
    const nextPilot = await pilotQueueService.getNextPilot();

    await prisma.$transaction(async (tx) => {
      // Pilot: forfeitCount +1, status AVAILABLE (roundCount zaten atamada artmıştı)
      await tx.pilot.update({
        where: { id: pilotId },
        data: { forfeitCount: { increment: 1 }, status: 'AVAILABLE', priorityOverride: false },
      });

      if (nextPilot) {
        await tx.flight.update({ where: { id: activeFlight.id }, data: { pilotId: nextPilot.id } });
        await tx.customer.update({ where: { id: activeFlight.customerId }, data: { assignedPilotId: nextPilot.id } });
        await tx.pilot.update({
          where: { id: nextPilot.id },
          data: { roundCount: { increment: 1 }, dailyFlightCount: { increment: 1 }, status: 'ASSIGNED' },
        });

        // NAS klasörü taşı
        try {
          const mediaFolder = await tx.flight.findUnique({ where: { id: activeFlight.id }, select: { mediaFolder: true } }).then(f => f?.mediaFolder);
          if (mediaFolder?.folderPath) {
            const { qnap } = await import('../services/qnapService.js');
            const oldPath = mediaFolder.folderPath.replace(/^media\//, '');
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = nextPilot.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ-]/g, '').trim();
            const newRelPath = `${dateStr}/${safeName}/${activeFlight.customer.displayId}`;
            const moved = await qnap.moveFolder(oldPath, newRelPath);
            if (moved) {
              await tx.mediaFolder.update({ where: { id: mediaFolder.id }, data: { folderPath: `media/${newRelPath}`, pilotId: nextPilot.id } });
            } else {
              await qnap.createFolder(newRelPath);
              await tx.mediaFolder.update({ where: { id: mediaFolder.id }, data: { folderPath: `media/${newRelPath}`, pilotId: nextPilot.id } });
            }
          }
        } catch (err: any) { console.error('[Self-Forfeit] NAS klasör taşıma hatası:', err?.message); }
      } else {
        await tx.flight.update({ where: { id: activeFlight.id }, data: { status: 'CANCELLED', cancellationReason: 'FORFEIT', notes: 'Pilot feragat — müsait pilot yok' } });
        await tx.customer.update({ where: { id: activeFlight.customerId }, data: { assignedPilotId: null } });
      }
    });
  } else {
    // Aktif uçuş yok — normal feragat
    const { forfeitPilot } = await import('../services/roundCounter.js');
    await forfeitPilot(pilotId);
  }

  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(pilotId);

  if (io) io.emit('pilot:queue-updated');

  res.json({ success: true, message: 'Feragat ettiniz' });
}));

// POST /api/pilots/:id/forfeit - Pilot feragat (admin)
// Pilot kuyruğun en sonuna gönderilir, lockedUntilRound = currentRound + 1
router.post('/:id/forfeit', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const pilot = await prisma.pilot.findUnique({ where: { id } });
  if (!pilot) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');

  // Aktif uçuş varsa: müşteriyi sonraki pilota taşı, roundCount zaten artmış sadece forfeitCount artır
  const activeFlight = await prisma.flight.findFirst({
    where: { pilotId: id, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
    include: { customer: true },
  });

  if (activeFlight) {
    // Müşteri var → roundCount zaten atamada artmıştı, tekrar artırma
    // Sadece forfeitCount artır + müşteriyi sonraki pilota taşı
    const io = req.app.get('io');
    const nextPilot = await pilotQueueService.getNextPilot();

    await prisma.$transaction(async (tx) => {
      // Eski pilot: forfeitCount +1, status AVAILABLE (roundCount değişmez — zaten artmıştı)
      await tx.pilot.update({
        where: { id },
        data: { forfeitCount: { increment: 1 }, status: 'AVAILABLE', priorityOverride: false },
      });

      if (nextPilot) {
        // Uçuşu sonraki pilota taşı
        await tx.flight.update({ where: { id: activeFlight.id }, data: { pilotId: nextPilot.id } });
        await tx.customer.update({ where: { id: activeFlight.customerId }, data: { assignedPilotId: nextPilot.id } });
        // Sonraki pilot: roundCount +1, dailyFlightCount +1, status ASSIGNED
        await tx.pilot.update({
          where: { id: nextPilot.id },
          data: { roundCount: { increment: 1 }, dailyFlightCount: { increment: 1 }, status: 'ASSIGNED' },
        });

        // NAS klasörü taşı — eski pilot → yeni pilot
        try {
          const mediaFolder = await tx.flight.findUnique({ where: { id: activeFlight.id }, select: { mediaFolder: true } }).then(f => f?.mediaFolder);
          if (mediaFolder?.folderPath) {
            const { qnap } = await import('../services/qnapService.js');
            const oldPath = mediaFolder.folderPath.replace(/^media\//, '');
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = nextPilot.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ-]/g, '').trim();
            const newRelPath = `${dateStr}/${safeName}/${activeFlight.customer.displayId}`;
            const moved = await qnap.moveFolder(oldPath, newRelPath);
            if (moved) {
              await tx.mediaFolder.update({ where: { id: mediaFolder.id }, data: { folderPath: `media/${newRelPath}`, pilotId: nextPilot.id } });
            } else {
              await qnap.createFolder(newRelPath);
              await tx.mediaFolder.update({ where: { id: mediaFolder.id }, data: { folderPath: `media/${newRelPath}`, pilotId: nextPilot.id } });
            }
          }
        } catch (err: any) { console.error('[Forfeit] NAS klasör taşıma hatası:', err?.message); }
      } else {
        // Sonraki pilot yok → uçuşu feragat olarak işaretle
        await tx.flight.update({ where: { id: activeFlight.id }, data: { status: 'CANCELLED', cancellationReason: 'FORFEIT', notes: 'Admin feragat — müsait pilot yok' } });
        await tx.customer.update({ where: { id: activeFlight.customerId }, data: { assignedPilotId: null } });
      }
    });

    await cache.pilotQueue.invalidate();
    await cache.pilot.invalidate(id);
    if (nextPilot) await cache.pilot.invalidate(nextPilot.id);

    if (io) io.emit('pilot:queue-updated');
    if (nextPilot && io) {
      io.to(`pilot:${nextPilot.id}`).emit('customer:assigned', {
        customer: { id: activeFlight.customerId, displayId: activeFlight.customer.displayId, firstName: activeFlight.customer.firstName, lastName: activeFlight.customer.lastName },
      });
    }
  } else {
    // Aktif uçuş yok → normal feragat
    const { forfeitPilot } = await import('../services/roundCounter.js');
    await forfeitPilot(id);
  }

  await cache.pilotQueue.invalidate();
  await cache.pilot.invalidate(id);

  const io = req.app.get('io');
  if (io) io.emit('pilot:queue-updated');

  // FCM bildirimi
  try {
    const { sendNativeToPilot } = await import('../services/firebaseNotification.js');
    sendNativeToPilot(id, {
      title: '⏭️ Sıranız Feragat Edildi',
      body: '1 tam tur sonra sıraya tekrar dahil olacaksınız.',
      data: { type: 'pilot_forfeited' },
    }).catch(() => {});
  } catch {}

  res.json({ success: true, message: 'Pilot feragat etti' });
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

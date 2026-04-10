import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { sendNativeBroadcast, sendNativeToUser, sendNativeNotification, sendNativeToPilot, sendNativeToAllPilots } from '../services/firebaseNotification.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/fcm/register - Register FCM token
router.post('/register', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { token, platform, device } = req.body;

  if (!token) {
    throw new AppError('Token gerekli', 400, 'MISSING_TOKEN');
  }

  // Upsert: varsa güncelle, yoksa oluştur
  const fcmToken = await prisma.fcmToken.upsert({
    where: { token },
    update: {
      userId: req.user!.id,
      platform: platform || null,
      device: device || null,
      isActive: true,
    },
    create: {
      userId: req.user!.id,
      token,
      platform: platform || null,
      device: device || null,
    },
  });

  res.json({ success: true, data: fcmToken, message: 'FCM token kaydedildi' });
}));

// DELETE /api/fcm/unregister - Unregister FCM token
router.delete('/unregister', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token gerekli', 400, 'MISSING_TOKEN');
  }

  await prisma.fcmToken.updateMany({
    where: { token, userId: req.user!.id },
    data: { isActive: false },
  });

  res.json({ success: true, message: 'FCM token kaldırıldı' });
}));

// GET /api/fcm/tokens - Admin: list all registered devices
router.get('/tokens', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const tokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: { id: true, username: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: tokens });
}));

// POST /api/fcm/broadcast - Send notification to all users (pilot + non-pilot)
router.post('/broadcast', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { title, body, data } = req.body;

  if (!title || !body) {
    throw new AppError('Başlık ve mesaj zorunludur', 400, 'MISSING_FIELDS');
  }

  const payload = { title, body, data: { type: 'broadcast', ...data } };

  // 1) Pilotlara: DB log + FCM push (sendNativeToAllPilots içinde ikisi de yapılıyor)
  await sendNativeToAllPilots(payload);

  // 2) Pilot-dışı kullanıcılara (admin, ofis, medya, vb.) — paralel push
  const otherTokens = await prisma.fcmToken.findMany({
    where: {
      isActive: true,
      user: { role: { not: 'PILOT' } },
    },
    select: { token: true },
  });
  if (otherTokens.length > 0) {
    await Promise.all(otherTokens.map(t => sendNativeNotification(t.token, payload)));
  }

  res.json({ success: true, message: 'Bildirim gönderildi' });
}));

// POST /api/fcm/send-role/:role - Send notification to specific role
router.post('/send-role/:role', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { role } = req.params;
  const { title, body, data } = req.body;

  if (!title || !body) {
    throw new AppError('Başlık ve mesaj zorunludur', 400, 'MISSING_FIELDS');
  }

  const validRoles = ['ADMIN', 'OFFICE_STAFF', 'PILOT', 'MEDIA_SELLER', 'CUSTOM'];
  if (!validRoles.includes(role)) {
    throw new AppError('Geçersiz rol', 400, 'INVALID_ROLE');
  }

  if (role === 'PILOT') {
    // Pilotlara gönderilince DB'ye log at
    await sendNativeToAllPilots({ title, body, data: { type: 'broadcast', ...data } });
  } else {
    const tokens = await prisma.fcmToken.findMany({
      where: { user: { role: role as any }, isActive: true },
    });
    if (tokens.length === 0) {
      throw new AppError('Bu role ait kayıtlı cihaz bulunamadı', 404, 'NO_DEVICES');
    }
    for (const t of tokens) {
      await sendNativeNotification(t.token, { title, body, data: { type: 'broadcast', ...data } });
    }
  }

  res.json({ success: true, message: `Bildirim ${role} rolüne gönderildi` });
}));

// GET /api/fcm/notification-settings - Get notification settings
router.get('/notification-settings', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  let settings = await prisma.notificationSetting.findFirst();

  if (!settings) {
    // Create default settings
    settings = await prisma.notificationSetting.create({
      data: {
        settings: {
          customer_assigned: { enabled: true, label: 'Müşteri Atandı', description: 'Pilota yeni müşteri atandığında bildirim gönder', title: '🪂 Yeni Müşteri Atandı', body: '{customer} ({displayId}) - {weight}kg' },
          customer_reassigned: { enabled: true, label: 'Müşteri Yeniden Atandı', description: 'Pilot değişikliğinde yeni pilota bildirim gönder', title: '🪂 Yeni Müşteri Atandı', body: '{customer} ({displayId}) - {weight}kg' },
          flight_cancelled: { enabled: true, label: 'Uçuş İptal Edildi', description: 'Uçuş iptal edildiğinde pilota bildirim gönder', title: '❌ Uçuş İptal Edildi', body: '{customer} ({displayId})' },
          flight_completed: { enabled: true, label: 'Uçuş Tamamlandı', description: 'Uçuş tamamlandığında pilota bildirim gönder', title: '✅ Uçuş Tamamlandı', body: '{customer} ({displayId}) - {duration}dk' },
          pilot_limit_warning: { enabled: true, label: 'Limit Uyarısı', description: 'Pilot günlük limite yaklaştığında bildirim gönder', title: '⚠️ Limit Uyarısı', body: 'Günlük uçuş limitine yaklaştınız: {current}/{max}' },
          pilot_limit_reached: { enabled: true, label: 'Limit Doldu', description: 'Pilot günlük limitine ulaştığında bildirim gönder', title: '🛑 Günlük Limit Doldu', body: '{current}/{max} uçuş tamamlandı. Bugünlük sıra dışısınız.' },
          pilot_first_in_queue: { enabled: true, label: 'İlk Sıra Bildirimi', description: 'Pilot sırada 1. olduğunda bildirim gönder', title: '🥇 İlk Sıradasınız!', body: 'Sıra size geldi, bir sonraki müşteri size atanacak.' },
        },
      },
    });
  }

  res.json({ success: true, data: settings });
}));

// PUT /api/fcm/notification-settings - Update notification settings
router.put('/notification-settings', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { settings: newSettings } = req.body;

  if (!newSettings || typeof newSettings !== 'object') {
    throw new AppError('Geçersiz ayarlar', 400, 'INVALID_SETTINGS');
  }

  let existing = await prisma.notificationSetting.findFirst();

  if (existing) {
    existing = await prisma.notificationSetting.update({
      where: { id: existing.id },
      data: { settings: newSettings },
    });
  } else {
    existing = await prisma.notificationSetting.create({
      data: { settings: newSettings },
    });
  }

  res.json({ success: true, data: existing, message: 'Bildirim ayarları güncellendi' });
}));

// GET /api/fcm/pilots - Admin: list active pilots with name and userId for targeting
router.get('/pilots', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const pilots = await prisma.pilot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      user: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: pilots });
}));

// POST /api/fcm/send-pilot/:pilotId - Send notification to a single pilot
router.post('/send-pilot/:pilotId', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const { title, body, data } = req.body;

  if (!title || !body) {
    throw new AppError('Başlık ve mesaj zorunludur', 400, 'MISSING_FIELDS');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: { user: true },
  });

  if (!pilot || !pilot.user) {
    throw new AppError('Pilot veya kullanıcı bulunamadı', 404, 'NOT_FOUND');
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { userId: pilot.user.id, isActive: true },
  });

  if (tokens.length === 0) {
    throw new AppError('Bu pilota ait kayıtlı cihaz bulunamadı', 404, 'NO_DEVICES');
  }

  await sendNativeToPilot(pilotId, { title, body, data: { type: 'manual', ...data } });

  res.json({ success: true, message: `Bildirim ${pilot.name} adlı pilota gönderildi (${tokens.length} cihaz)` });
}));

// POST /api/fcm/keepalive - PUBLIC: Keep existing FCM token active (no auth required)
// Safe because we only update tokens already in DB — we don't change their user mapping
router.post('/keepalive', asyncHandler(async (req: AuthRequest, res: any) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token gerekli', 400, 'MISSING_TOKEN');
  }

  const existing = await prisma.fcmToken.findUnique({ where: { token } });

  if (!existing) {
    // Token not in DB — can't keepalive an unknown token
    return res.status(404).json({ success: false, message: 'Token kayıtlı değil, giriş yapın' });
  }

  await prisma.fcmToken.update({
    where: { token },
    data: { isActive: true },
  });

  res.json({ success: true, message: 'FCM token aktif tutuldu' });
}));

// POST /api/fcm/refresh - Refresh/keepalive FCM token (updates updatedAt)
router.post('/refresh', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { token, platform, device } = req.body;

  if (!token) {
    throw new AppError('Token gerekli', 400, 'MISSING_TOKEN');
  }

  const existing = await prisma.fcmToken.findUnique({ where: { token } });

  if (existing) {
    await prisma.fcmToken.update({
      where: { token },
      data: {
        userId: req.user!.id,
        isActive: true,
        platform: platform || existing.platform,
        device: device || existing.device,
      },
    });
  } else {
    await prisma.fcmToken.create({
      data: {
        userId: req.user!.id,
        token,
        platform: platform || null,
        device: device || null,
      },
    });
  }

  res.json({ success: true, message: 'FCM token yenilendi' });
}));

// DELETE /api/fcm/token/:id - Delete a specific FCM token
router.delete('/token/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const token = await prisma.fcmToken.findUnique({ where: { id } });
  if (!token) {
    throw new AppError('Token bulunamadı', 404, 'NOT_FOUND');
  }

  await prisma.fcmToken.delete({ where: { id } });

  res.json({ success: true, message: 'Cihaz kaldırıldı' });
}));

// GET /api/fcm/pilot-notifications/:pilotId - Get today's notifications for a pilot
router.get('/pilot-notifications/:pilotId', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;

  // Pilots can only view their own notifications
  if (req.user!.role === 'PILOT' && req.user!.pilotId !== pilotId) {
    throw new AppError('Bu bildirimlere erişim yetkiniz yok', 403, 'FORBIDDEN');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notifications = await prisma.pilotNotification.findMany({
    where: {
      pilotId,
      createdAt: { gte: today },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: notifications });
}));

// PATCH /api/fcm/pilot-notifications/:pilotId/read-all - Mark all today's notifications as read
router.patch('/pilot-notifications/:pilotId/read-all', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;

  if (req.user!.role === 'PILOT' && req.user!.pilotId !== pilotId) {
    throw new AppError('Bu bildirimlere erişim yetkiniz yok', 403, 'FORBIDDEN');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.pilotNotification.updateMany({
    where: { pilotId, createdAt: { gte: today }, isRead: false },
    data: { isRead: true },
  });

  res.json({ success: true, message: 'Bildirimler okundu olarak işaretlendi' });
}));

// PATCH /api/fcm/pilot-notifications/:id/read - Mark single notification as read
router.patch('/pilot-notifications/:id/read', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  await prisma.pilotNotification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json({ success: true });
}));

export default router;

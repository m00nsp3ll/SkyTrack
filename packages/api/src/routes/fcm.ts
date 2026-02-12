import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { sendNativeBroadcast, sendNativeToUser, sendNativeNotification } from '../services/firebaseNotification.js';

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

// POST /api/fcm/broadcast - Send notification to all or by role
router.post('/broadcast', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { title, body, data } = req.body;

  if (!title || !body) {
    throw new AppError('Başlık ve mesaj zorunludur', 400, 'MISSING_FIELDS');
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { isActive: true },
  });

  if (tokens.length === 0) {
    throw new AppError('Kayıtlı cihaz bulunamadı', 404, 'NO_DEVICES');
  }

  await sendNativeBroadcast({ title, body, data: { type: 'broadcast', ...data } });

  res.json({ success: true, message: `Bildirim ${tokens.length} cihaza gönderildi` });
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

  const tokens = await prisma.fcmToken.findMany({
    where: { user: { role: role as any }, isActive: true },
  });

  if (tokens.length === 0) {
    throw new AppError('Bu role ait kayıtlı cihaz bulunamadı', 404, 'NO_DEVICES');
  }

  for (const t of tokens) {
    await sendNativeNotification(t.token, { title, body, data: { type: 'broadcast', ...data } });
  }

  res.json({ success: true, message: `Bildirim ${tokens.length} cihaza gönderildi (${role})` });
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

export default router;

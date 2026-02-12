import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

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

export default router;

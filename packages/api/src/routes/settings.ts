import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireSuperAdmin, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/settings/:key - Bir ayarı getir (authenticated)
router.get('/:key', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { key } = req.params;
  const setting = await prisma.setting.findUnique({ where: { key } });
  res.json({ success: true, data: { key, value: setting?.value || null } });
}));

// PATCH /api/settings/:key - Ayar güncelle (sadece SUPER_ADMIN)
router.patch('/:key', authenticate, requireSuperAdmin, asyncHandler(async (req: AuthRequest, res: any) => {
  const { key } = req.params;
  const { value } = req.body;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError('value zorunlu (string veya number)', 400, 'INVALID_VALUE');
  }
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  res.json({ success: true, data: setting });
}));

// PATCH /api/settings/pilots/:pilotId/fee - Pilot bazlı pilotaj ücreti (sadece SUPER_ADMIN)
// Body: { fee: number | null }  null = global ayarı kullan
router.patch('/pilots/:pilotId/fee', authenticate, requireSuperAdmin, asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const { fee } = req.body;

  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');

  await prisma.pilot.update({
    where: { id: pilotId },
    data: { flightFee: fee === null || fee === undefined ? null : Number(fee) },
  });

  res.json({ success: true, message: 'Pilotaj ücreti güncellendi' });
}));

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, requireSuperAdmin, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// ============ FIRMALAR ============
// GET /api/settings/companies - Firmalar listesi
router.get('/companies/list', authenticate, asyncHandler(async (_req: AuthRequest, res: any) => {
  const companies = await prisma.company.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: companies });
}));

// PATCH /api/settings/pilots/:pilotId/company - Pilot firma ata (admin)
router.patch('/pilots/:pilotId/company', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const { companyId } = req.body; // null veya company id
  await prisma.pilot.update({ where: { id: pilotId }, data: { companyId: companyId || null } });
  res.json({ success: true, message: 'Firma güncellendi' });
}));

// ============ ÖDEMELER ============
// GET /api/settings/payments - Tüm ödemeler (admin)
router.get('/payments/all', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId, from, to } = req.query;
  const where: any = { deletedAt: null };
  if (pilotId) where.pilotId = pilotId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string);
  }
  const payments = await prisma.pilotPayment.findMany({
    where,
    include: {
      pilot: { select: { id: true, name: true, company: { select: { name: true } } } },
      paidBy: { select: { id: true, username: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: payments });
}));

// POST /api/settings/payments - Yeni ödeme (admin; sonra sadece SUPER_ADMIN yapılacak)
router.post('/payments', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId, amount, note, periodFrom, periodTo } = req.body;
  if (!pilotId || !amount || amount <= 0) {
    throw new AppError('pilotId ve amount (>0) zorunlu', 400, 'INVALID_INPUT');
  }
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');

  const payment = await prisma.pilotPayment.create({
    data: {
      pilotId,
      amount: Number(amount),
      note: note || null,
      paidById: req.user!.id,
      periodFrom: periodFrom ? new Date(periodFrom) : null,
      periodTo: periodTo ? new Date(periodTo) : null,
    },
    include: {
      pilot: { select: { id: true, name: true } },
      paidBy: { select: { username: true, name: true } },
    },
  });
  res.json({ success: true, data: payment, message: 'Ödeme kaydedildi' });
}));

// PATCH /api/settings/payments/:id - Ödeme düzenle (admin)
router.patch('/payments/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { amount, note, periodFrom, periodTo } = req.body;
  const existing = await prisma.pilotPayment.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new AppError('Ödeme bulunamadı', 404, 'PAYMENT_NOT_FOUND');

  const payment = await prisma.pilotPayment.update({
    where: { id },
    data: {
      amount: amount !== undefined ? Number(amount) : undefined,
      note: note !== undefined ? note : undefined,
      periodFrom: periodFrom !== undefined ? (periodFrom ? new Date(periodFrom) : null) : undefined,
      periodTo: periodTo !== undefined ? (periodTo ? new Date(periodTo) : null) : undefined,
    },
  });
  res.json({ success: true, data: payment, message: 'Ödeme güncellendi' });
}));

// DELETE /api/settings/payments/:id - Ödeme sil (soft delete, admin)
router.delete('/payments/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  await prisma.pilotPayment.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ success: true, message: 'Ödeme silindi' });
}));

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

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/teams - Tüm takımları listele (pilotlarla birlikte)
router.get('/', authenticate, asyncHandler(async (_req: AuthRequest, res: any) => {
  const teams = await prisma.team.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      pilots: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          queuePosition: true,
          isTeamLeader: true,
          dailyFlightCount: true,
          maxDailyFlights: true,
        },
        orderBy: [{ isTeamLeader: 'desc' }, { queuePosition: 'asc' }],
      },
    },
  });
  res.json({ success: true, data: teams });
}));

// POST /api/teams - Takım oluştur (admin)
router.post('/', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { name, color, sortOrder } = req.body;
  if (!name) throw new AppError('Takım adı zorunlu', 400, 'INVALID_INPUT');

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      color: color || '#3b82f6',
      sortOrder: sortOrder ?? 0,
    },
  });
  res.json({ success: true, data: team });
}));

// PATCH /api/teams/:id - Takım güncelle (admin)
router.patch('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { name, color, sortOrder } = req.body;
  const team = await prisma.team.update({
    where: { id },
    data: {
      name: name?.trim(),
      color,
      sortOrder,
    },
  });
  res.json({ success: true, data: team });
}));

// DELETE /api/teams/:id - Takım sil (admin)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  // Pilotların teamId'sini null yap, takımı sil
  await prisma.pilot.updateMany({ where: { teamId: id }, data: { teamId: null, isTeamLeader: false } });
  await prisma.team.delete({ where: { id } });
  res.json({ success: true, message: 'Takım silindi' });
}));

// PATCH /api/pilots/:id/team - Pilotu takıma ata (admin)
router.patch('/pilots/:pilotId/team', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const { teamId } = req.body;

  // Pilotun önceki takımında leader ise önce leader'ı kaldır
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');

  await prisma.pilot.update({
    where: { id: pilotId },
    data: {
      teamId: teamId || null,
      // Takım değişince leader rolü kaldırılır (yeni takımda tekrar atanabilir)
      isTeamLeader: false,
    },
  });
  res.json({ success: true, message: 'Pilot takıma atandı' });
}));

// PATCH /api/teams/pilots/:pilotId/leader - Takım lideri toggle (admin)
router.patch('/pilots/:pilotId/leader', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
  if (!pilot.teamId) throw new AppError('Pilot bir takıma atanmış olmalı', 400, 'PILOT_NO_TEAM');

  const newLeaderStatus = !pilot.isTeamLeader;

  // Eğer lider yapılıyorsa, aynı takımdaki diğer liderleri kaldır (her takımda 1 lider)
  if (newLeaderStatus) {
    await prisma.pilot.updateMany({
      where: { teamId: pilot.teamId, isTeamLeader: true, id: { not: pilotId } },
      data: { isTeamLeader: false },
    });
  }

  await prisma.pilot.update({
    where: { id: pilotId },
    data: { isTeamLeader: newLeaderStatus },
  });
  res.json({
    success: true,
    message: newLeaderStatus ? 'Takım lideri atandı' : 'Takım lideri kaldırıldı',
  });
}));

export default router;

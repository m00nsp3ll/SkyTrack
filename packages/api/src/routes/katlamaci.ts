import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

// GET /api/katlamaci/live — Havada + Bekliyor (müşteri bilgisi yok)
router.get('/live', authenticate, requireRole('KATLAMACI', 'ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const flights = await prisma.flight.findMany({
    where: {
      status: { in: ['IN_FLIGHT', 'ASSIGNED', 'PICKED_UP'] },
      createdAt: { gte: today },
    },
    include: {
      pilot: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = Date.now();

  const inFlight = flights
    .filter(f => f.status === 'IN_FLIGHT')
    .map(f => ({
      flightId: f.id,
      pilotName: f.pilot.name,
      takeoffAt: f.takeoffAt,
      elapsedMinutes: f.takeoffAt ? Math.floor((now - new Date(f.takeoffAt).getTime()) / 60000) : 0,
    }));

  const waiting = flights
    .filter(f => f.status === 'ASSIGNED' || f.status === 'PICKED_UP')
    .map(f => ({
      flightId: f.id,
      pilotName: f.pilot.name,
      status: f.status,
      assignedAt: f.createdAt,
      waitMinutes: Math.floor((now - new Date(f.createdAt).getTime()) / 60000),
    }));

  res.json({ success: true, data: { inFlight, waiting } });
}));

export default router;

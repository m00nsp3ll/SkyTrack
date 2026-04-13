import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import * as swapService from '../services/pilotSwap.js';

const router = Router();

// POST /api/swap-requests — Yeni swap talebi oluştur (pilot kendi uçuşu için)
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) throw new AppError('Sadece pilotlar swap talebi oluşturabilir', 403, 'NOT_PILOT');
  const { targetPilotId } = req.body;
  if (!targetPilotId) throw new AppError('targetPilotId zorunlu', 400, 'INVALID_INPUT');

  try {
    const swap = await swapService.createSwapRequest(req.user.pilotId, targetPilotId);
    // Socket.IO ile target pilota anlık bildirim → modal hemen açılsın
    const io = req.app.get('io');
    if (io) {
      io.to(`pilot:${targetPilotId}`).emit('pilot:swap-requested', { swapRequestId: swap.id });
    }
    res.json({ success: true, data: swap, message: 'Talep gönderildi. 60 saniye içinde yanıtlanmalı.' });
  } catch (e: any) {
    throw new AppError(e.message, 400, 'SWAP_CREATE_FAILED');
  }
}));

// POST /api/swap-requests/:id/approve
router.post('/:id/approve', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) throw new AppError('Sadece pilotlar onaylayabilir', 403, 'NOT_PILOT');
  try {
    const result = await swapService.approveSwap(req.params.id, req.user.pilotId);
    const io = req.app.get('io');
    if (io) {
      io.emit('pilot:queue-updated');
      // İki pilota da anlık bildirim — UI hemen güncellenir
      io.to(`pilot:${result.requesterPilotId}`).emit('pilot:swap-completed', { swapId: result.id });
      io.to(`pilot:${result.targetPilotId}`).emit('pilot:swap-completed', { swapId: result.id });
    }
    res.json({ success: true, data: result, message: 'Değişim onaylandı' });
  } catch (e: any) {
    throw new AppError(e.message, 400, 'SWAP_APPROVE_FAILED');
  }
}));

// POST /api/swap-requests/:id/decline
router.post('/:id/decline', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) throw new AppError('Sadece pilotlar reddedebilir', 403, 'NOT_PILOT');
  try {
    const result = await swapService.declineSwap(req.params.id, req.user.pilotId);
    res.json({ success: true, data: result, message: 'Reddedildi' });
  } catch (e: any) {
    throw new AppError(e.message, 400, 'SWAP_DECLINE_FAILED');
  }
}));

// GET /api/swap-requests/pending — Pilot için bekleyen talep (polling fallback)
router.get('/pending', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) return res.json({ success: true, data: null });
  const pending = await swapService.getPendingSwapForPilot(req.user.pilotId);
  res.json({ success: true, data: pending });
}));

// GET /api/swap-requests/swappable — Swap için uygun pilotları getir
router.get('/swappable', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  if (!req.user?.pilotId) return res.json({ success: true, data: [] });
  const pilots = await swapService.getSwappablePilots(req.user.pilotId);
  res.json({ success: true, data: pilots });
}));

export default router;

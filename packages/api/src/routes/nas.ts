import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { qnap } from '../services/qnapService.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/nas/status - NAS bağlantı testi (admin only)
router.get('/status', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const result = await qnap.testConnection();
  res.json({
    success: true,
    data: result,
  });
}));

// GET /api/nas/disk-usage - Disk kullanım bilgisi (admin only)
router.get('/disk-usage', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const usage = await qnap.getDiskUsage();
  if (!usage) {
    return res.json({
      success: false,
      data: null,
      message: 'Disk kullanım bilgisi alınamadı',
    });
  }
  res.json({
    success: true,
    data: usage,
  });
}));

// GET /api/customers/:id/media-files - Müşteri dosyalarını listele
router.get('/customers/:id/files', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { OR: [{ id }, { displayId: id }] },
    select: { id: true, displayId: true, mediaFolderPath: true },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (!customer.mediaFolderPath) {
    return res.json({ success: true, data: { files: [], folderPath: null } });
  }

  // mediaFolderPath: /share/skytrack-media/2026-03-28/PilotAdi/A0001
  // relativePath: 2026-03-28/PilotAdi/A0001
  const mediaBase = process.env.QNAP_MEDIA_PATH || '/share/skytrack-media';
  const relativePath = customer.mediaFolderPath.replace(mediaBase + '/', '');

  const files = await qnap.listFilesDetailed(relativePath);

  res.json({
    success: true,
    data: {
      files,
      folderPath: customer.mediaFolderPath,
      relativePath,
    },
  });
}));

// POST /api/nas/customers/:id/create-folder - Manuel klasör oluştur
router.post('/customers/:id/create-folder', authenticate, requireRole('ADMIN', 'OFFICE_STAFF'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { OR: [{ id }, { displayId: id }] },
    include: {
      assignedPilot: { select: { id: true, name: true } },
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  const today = new Date().toISOString().split('T')[0];
  const pilotName = customer.assignedPilot?.name || 'Pilot_Yok';

  const folderPath = await qnap.createCustomerFolder(today, pilotName, customer.displayId);

  if (!folderPath) {
    throw new AppError('NAS klasörü oluşturulamadı', 500, 'NAS_FOLDER_CREATE_ERROR');
  }

  // DB'ye kaydet
  await prisma.customer.update({
    where: { id: customer.id },
    data: { mediaFolderPath: folderPath },
  });

  res.json({
    success: true,
    data: { folderPath },
    message: `NAS klasörü oluşturuldu: ${folderPath}`,
  });
}));

export default router;

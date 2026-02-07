import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getMediaFolderPath,
  ensureFolderStructure,
  scanAndProcessFolder,
  listMediaFiles,
  generateImageThumbnail,
  generateVideoThumbnail,
  getFileType,
  getDiskStats,
  getTodayMediaStats,
} from '../services/media.js';

const router = Router();
const prisma = new PrismaClient();

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { customerId } = req.params;

    try {
      // Get customer and their media folder
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          flights: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              pilot: true,
              mediaFolder: true,
            },
          },
        },
      });

      if (!customer) {
        return cb(new Error('Müşteri bulunamadı'), '');
      }

      const latestFlight = customer.flights[0];
      if (!latestFlight) {
        return cb(new Error('Müşterinin uçuşu bulunamadı'), '');
      }

      let folderPath: string;

      if (latestFlight.mediaFolder) {
        folderPath = latestFlight.mediaFolder.folderPath;
      } else {
        // Create folder path
        const today = new Date().toISOString().split('T')[0];
        folderPath = getMediaFolderPath(today, latestFlight.pilotId, customer.displayId);
      }

      const originalsPath = path.join(folderPath, 'originals');
      await fs.mkdir(originalsPath, { recursive: true });

      cb(null, originalsPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Preserve original filename (GoPro names like GOPR0001.MP4)
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitized);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}`));
    }
  },
});

// POST /api/media/upload/:customerId - Upload files for a customer
router.post(
  '/upload/:customerId',
  authenticate,
  upload.array('files', 50), // Max 50 files at once
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('Dosya yüklenmedi', 400, 'NO_FILES');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const latestFlight = customer.flights[0];
    if (!latestFlight) {
      throw new AppError('Müşterinin uçuşu bulunamadı', 404, 'FLIGHT_NOT_FOUND');
    }

    const folderPath = path.dirname(files[0].destination);
    const thumbnailsPath = path.join(folderPath, 'thumbnails');
    await fs.mkdir(thumbnailsPath, { recursive: true });

    // Generate thumbnails for uploaded files
    const processed: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const fileType = getFileType(file.mimetype);
        const thumbnailName = path.basename(file.filename, path.extname(file.filename)) + '_thumb.jpg';
        const thumbnailPath = path.join(thumbnailsPath, thumbnailName);

        if (fileType === 'photo') {
          await generateImageThumbnail(file.path, thumbnailPath);
        } else if (fileType === 'video') {
          await generateVideoThumbnail(file.path, thumbnailPath);
        }

        processed.push(file.filename);
      } catch (err) {
        errors.push(`${file.filename}: ${(err as Error).message}`);
      }
    }

    // Update media folder stats
    const allFiles = await listMediaFiles(folderPath);
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

    await prisma.mediaFolder.upsert({
      where: { flightId: latestFlight.id },
      create: {
        flightId: latestFlight.id,
        customerId: customer.id,
        pilotId: latestFlight.pilotId,
        folderPath,
        fileCount: allFiles.length,
        totalSizeBytes: totalSize,
      },
      update: {
        fileCount: allFiles.length,
        totalSizeBytes: totalSize,
      },
    });

    res.json({
      success: true,
      data: {
        uploaded: files.length,
        processed: processed.length,
        errors,
      },
      message: `${files.length} dosya yüklendi, ${processed.length} thumbnail oluşturuldu`,
    });
  })
);

// POST /api/media/:customerId/scan - Scan folder and generate thumbnails
router.post(
  '/:customerId/scan',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            pilot: true,
            mediaFolder: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const latestFlight = customer.flights[0];
    if (!latestFlight) {
      throw new AppError('Müşterinin uçuşu bulunamadı', 404, 'FLIGHT_NOT_FOUND');
    }

    let folderPath: string;

    if (latestFlight.mediaFolder) {
      folderPath = latestFlight.mediaFolder.folderPath;
    } else {
      const today = new Date().toISOString().split('T')[0];
      folderPath = getMediaFolderPath(today, latestFlight.pilotId, customer.displayId);
    }

    // Ensure folder structure exists
    await ensureFolderStructure(folderPath);

    // Scan and process folder
    const result = await scanAndProcessFolder(folderPath, customer.id, latestFlight.pilotId);

    res.json({
      success: true,
      data: result,
      message: `${result.processed} dosya işlendi`,
    });
  })
);

// GET /api/media/:customerId - Get media folder info
router.get(
  '/:customerId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            pilot: true,
            mediaFolder: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const latestFlight = customer.flights[0];
    const mediaFolder = latestFlight?.mediaFolder;

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          displayId: customer.displayId,
          name: `${customer.firstName} ${customer.lastName}`,
        },
        flight: latestFlight ? {
          id: latestFlight.id,
          status: latestFlight.status,
          pilotName: latestFlight.pilot.name,
        } : null,
        mediaFolder: mediaFolder ? {
          id: mediaFolder.id,
          folderPath: mediaFolder.folderPath,
          fileCount: mediaFolder.fileCount,
          totalSizeBytes: mediaFolder.totalSizeBytes,
          paymentStatus: mediaFolder.paymentStatus,
          deliveryStatus: mediaFolder.deliveryStatus,
        } : null,
      },
    });
  })
);

// GET /api/media/:customerId/files - List all media files for a customer
router.get(
  '/:customerId/files',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      return res.json({
        success: true,
        data: {
          files: [],
          totalSize: 0,
        },
      });
    }

    const files = await listMediaFiles(mediaFolder.folderPath);

    // Convert file paths to URLs
    const serverIp = process.env.SERVER_IP || 'localhost';
    const filesWithUrls = files.map((file) => ({
      ...file,
      url: `http://${serverIp}/media/${path.relative(MEDIA_BASE_PATH, file.path)}`,
      thumbnailUrl: file.thumbnailPath
        ? `http://${serverIp}/media/${path.relative(MEDIA_BASE_PATH, file.thumbnailPath)}`
        : null,
    }));

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        paymentStatus: mediaFolder.paymentStatus,
        deliveryStatus: mediaFolder.deliveryStatus,
      },
    });
  })
);

// GET /api/media/:customerId/download - Download all files as ZIP
router.get(
  '/:customerId/download',
  asyncHandler(async (req: any, res: any) => {
    const { customerId } = req.params;

    // Find by customer ID or displayId
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: customerId },
          { displayId: customerId },
        ],
      },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    }

    // Check payment status for public downloads
    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');
    }

    const originalsPath = path.join(mediaFolder.folderPath, 'originals');

    // Set response headers for ZIP download
    const zipFilename = `${customer.displayId}_medya.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.on('error', (err) => {
      throw new AppError('ZIP oluşturma hatası', 500, 'ZIP_ERROR');
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add originals folder to archive
    archive.directory(originalsPath, 'medya');

    // Finalize archive
    await archive.finalize();

    // Update delivery status
    await prisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: { deliveryStatus: 'DELIVERED' },
    });
  })
);

// GET /api/media/:customerId/download/:filename - Download single file
router.get(
  '/:customerId/download/:filename',
  asyncHandler(async (req: any, res: any) => {
    const { customerId, filename } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: customerId },
          { displayId: customerId },
        ],
      },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    }

    // Check payment status for public downloads
    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');
    }

    const filePath = path.join(mediaFolder.folderPath, 'originals', filename);

    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('Dosya bulunamadı', 404, 'FILE_NOT_FOUND');
    }

    res.download(filePath, filename);
  })
);

// PATCH /api/media/:customerId/payment - Update payment status
router.patch(
  '/:customerId/payment',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;
    const { status, amount, paymentMethod } = req.body;

    if (!['PENDING', 'PAID'].includes(status)) {
      throw new AppError('Geçersiz ödeme durumu', 400, 'INVALID_STATUS');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    }

    const updatedFolder = await prisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: {
        paymentStatus: status,
        deliveryStatus: status === 'PAID' ? 'READY' : mediaFolder.deliveryStatus,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('media:payment-updated', {
        customerId: customer.id,
        displayId: customer.displayId,
        paymentStatus: status,
      });
    }

    res.json({
      success: true,
      data: updatedFolder,
      message: status === 'PAID' ? 'Ödeme alındı' : 'Ödeme durumu güncellendi',
    });
  })
);

// PATCH /api/media/:customerId/delivery - Update delivery status
router.patch(
  '/:customerId/delivery',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'READY', 'DELIVERED'].includes(status)) {
      throw new AppError('Geçersiz teslim durumu', 400, 'INVALID_STATUS');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    }

    const updatedFolder = await prisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: { deliveryStatus: status },
    });

    res.json({
      success: true,
      data: updatedFolder,
      message: 'Teslim durumu güncellendi',
    });
  })
);

// POST /api/media/:customerId/move-to/:targetCustomerId - Move files to another customer
router.post(
  '/:customerId/move-to/:targetCustomerId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId, targetCustomerId } = req.params;

    const sourceCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    const targetCustomer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            pilot: true,
            mediaFolder: true,
          },
        },
      },
    });

    if (!sourceCustomer) {
      throw new AppError('Kaynak müşteri bulunamadı', 404, 'SOURCE_NOT_FOUND');
    }

    if (!targetCustomer) {
      throw new AppError('Hedef müşteri bulunamadı', 404, 'TARGET_NOT_FOUND');
    }

    const sourceFolder = sourceCustomer.flights[0]?.mediaFolder;
    if (!sourceFolder) {
      throw new AppError('Kaynak medya klasörü bulunamadı', 404, 'SOURCE_FOLDER_NOT_FOUND');
    }

    const targetFlight = targetCustomer.flights[0];
    if (!targetFlight) {
      throw new AppError('Hedef müşterinin uçuşu bulunamadı', 404, 'TARGET_FLIGHT_NOT_FOUND');
    }

    // Create target folder if not exists
    const today = new Date().toISOString().split('T')[0];
    const targetFolderPath = getMediaFolderPath(today, targetFlight.pilotId, targetCustomer.displayId);
    await ensureFolderStructure(targetFolderPath);

    // Move files from source to target
    const sourceOriginalsPath = path.join(sourceFolder.folderPath, 'originals');
    const targetOriginalsPath = path.join(targetFolderPath, 'originals');

    const files = await fs.readdir(sourceOriginalsPath);
    for (const file of files) {
      await fs.rename(
        path.join(sourceOriginalsPath, file),
        path.join(targetOriginalsPath, file)
      );
    }

    // Move thumbnails
    const sourceThumbnailsPath = path.join(sourceFolder.folderPath, 'thumbnails');
    const targetThumbnailsPath = path.join(targetFolderPath, 'thumbnails');

    try {
      const thumbnails = await fs.readdir(sourceThumbnailsPath);
      for (const thumb of thumbnails) {
        await fs.rename(
          path.join(sourceThumbnailsPath, thumb),
          path.join(targetThumbnailsPath, thumb)
        );
      }
    } catch {
      // Thumbnails folder might not exist
    }

    // Update or create target media folder record
    const allFiles = await listMediaFiles(targetFolderPath);
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

    await prisma.mediaFolder.upsert({
      where: { flightId: targetFlight.id },
      create: {
        flightId: targetFlight.id,
        customerId: targetCustomer.id,
        pilotId: targetFlight.pilotId,
        folderPath: targetFolderPath,
        fileCount: allFiles.length,
        totalSizeBytes: totalSize,
      },
      update: {
        fileCount: allFiles.length,
        totalSizeBytes: totalSize,
      },
    });

    // Update source folder to have 0 files
    await prisma.mediaFolder.update({
      where: { id: sourceFolder.id },
      data: {
        fileCount: 0,
        totalSizeBytes: 0,
      },
    });

    res.json({
      success: true,
      message: `${files.length} dosya ${targetCustomer.displayId} müşterisine taşındı`,
    });
  })
);

// DELETE /api/media/:customerId/files/:filename - Delete a file
router.delete(
  '/:customerId/files/:filename',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId, filename } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    }

    const filePath = path.join(mediaFolder.folderPath, 'originals', filename);
    const thumbName = path.basename(filename, path.extname(filename)) + '_thumb.jpg';
    const thumbPath = path.join(mediaFolder.folderPath, 'thumbnails', thumbName);

    // Delete original file
    try {
      await fs.unlink(filePath);
    } catch {
      throw new AppError('Dosya bulunamadı', 404, 'FILE_NOT_FOUND');
    }

    // Delete thumbnail if exists
    try {
      await fs.unlink(thumbPath);
    } catch {
      // Thumbnail might not exist
    }

    // Update folder stats
    const allFiles = await listMediaFiles(mediaFolder.folderPath);
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

    await prisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: {
        fileCount: allFiles.length,
        totalSizeBytes: totalSize,
      },
    });

    res.json({
      success: true,
      message: 'Dosya silindi',
    });
  })
);

// GET /api/media/stats/today - Today's media stats
router.get(
  '/stats/today',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const stats = await getTodayMediaStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// GET /api/media/storage - Disk storage stats
router.get(
  '/storage',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const stats = await getDiskStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// GET /api/media/folders - List all media folders with pagination
router.get(
  '/folders',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { date, paymentStatus, deliveryStatus, cursor, limit = '50' } = req.query;

    const take = Math.min(parseInt(limit as string) || 50, 100);
    const where: any = {};

    // Date filter
    if (date) {
      const filterDate = new Date(date as string);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    // Delivery status filter
    if (deliveryStatus && deliveryStatus !== 'all') {
      where.deliveryStatus = deliveryStatus;
    }

    const cursorOption = cursor ? { id: cursor as string } : undefined;

    const folders = await prisma.mediaFolder.findMany({
      where,
      take: take + 1,
      skip: cursor ? 1 : 0,
      cursor: cursorOption,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            displayId: true,
            firstName: true,
            lastName: true,
          },
        },
        pilot: {
          select: {
            id: true,
            name: true,
          },
        },
        flight: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const hasMore = folders.length > take;
    const data = hasMore ? folders.slice(0, -1) : folders;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    res.json({
      success: true,
      data,
      pagination: {
        hasMore,
        nextCursor,
        count: data.length,
      },
    });
  })
);

export default router;

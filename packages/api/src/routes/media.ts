import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import archiver from 'archiver';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getMediaFolderPath,
  ensureFolderStructure,
  scanAndProcessFolder,
  listMediaFiles,
  getDiskStats,
  getTodayMediaStats,
  sanitizePilotName,
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
        // Create folder path with pilot name and sorti number
        const today = new Date().toISOString().split('T')[0];
        const pilotName = latestFlight.pilot?.name || 'unknown';
        // Count completed flights for this pilot today to determine sorti number
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const pilotFlightsToday = await prisma.flight.count({
          where: {
            pilotId: latestFlight.pilotId,
            createdAt: { gte: todayStart },
          },
        });
        const sortiNumber = pilotFlightsToday;
        folderPath = getMediaFolderPath(today, pilotName, sortiNumber, customer.displayId);
      }

      await fs.mkdir(folderPath, { recursive: true });

      cb(null, folderPath);
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

// ==========================================
// STATIC ROUTES (must come before :customerId)
// ==========================================

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

// ==========================================
// DYNAMIC ROUTES (with :customerId parameter)
// ==========================================

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

    const folderPath = files[0].destination;

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
      },
      message: `${files.length} dosya yüklendi`,
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
      const pilotName = latestFlight.pilot?.name || 'unknown';
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const pilotFlightsToday = await prisma.flight.count({
        where: {
          pilotId: latestFlight.pilotId,
          createdAt: { gte: todayStart },
        },
      });
      folderPath = getMediaFolderPath(today, pilotName, pilotFlightsToday, customer.displayId);
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

    // Search by id or displayId
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: customerId }, { displayId: customerId }],
      },
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
          totalSizeBytes: Number(mediaFolder.totalSizeBytes),
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

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: customerId }, { displayId: customerId }],
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

// GET /api/media/:customerId/public-files - Public file list for customer download page
router.get(
  '/:customerId/public-files',
  asyncHandler(async (req: any, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: customerId }, { displayId: customerId }],
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
      return res.json({
        success: true,
        data: { files: [] },
      });
    }

    // Check payment status - only return files if paid
    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan dosyalar görüntülenemez', 403, 'PAYMENT_REQUIRED');
    }

    const files = await listMediaFiles(mediaFolder.folderPath);

    // Return only filename, type, and size (no full paths for security)
    const fileList = files.map((file) => ({
      filename: file.filename,
      type: file.type,
      size: file.size,
    }));

    res.json({
      success: true,
      data: { files: fileList },
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

    // Set response headers for ZIP download
    const zipFilename = `${customer.displayId}_medya.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.on('error', () => {
      throw new AppError('ZIP oluşturma hatası', 500, 'ZIP_ERROR');
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add media folder to archive with "Alanya Paragliding" folder name
    archive.directory(mediaFolder.folderPath, 'Alanya Paragliding');

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

    const filePath = path.join(mediaFolder.folderPath, filename);

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

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: customerId }, { displayId: customerId }],
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
      data: {
        ...updatedFolder,
        totalSizeBytes: Number(updatedFolder.totalSizeBytes),
      },
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
    const pilotName = targetFlight.pilot?.name || 'unknown';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const pilotFlightsToday = await prisma.flight.count({
      where: {
        pilotId: targetFlight.pilotId,
        createdAt: { gte: todayStart },
      },
    });
    const targetFolderPath = getMediaFolderPath(today, pilotName, pilotFlightsToday, targetCustomer.displayId);
    await ensureFolderStructure(targetFolderPath);

    // Move files from source to target (flat folder)
    const files = await fs.readdir(sourceFolder.folderPath);
    const mediaFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
    });
    for (const file of mediaFiles) {
      await fs.rename(
        path.join(sourceFolder.folderPath, file),
        path.join(targetFolderPath, file)
      );
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

    const filePath = path.join(mediaFolder.folderPath, filename);

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch {
      throw new AppError('Dosya bulunamadı', 404, 'FILE_NOT_FOUND');
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

// POST /api/media/:customerId/open-folder - Open media folder in Finder (macOS)
router.post(
  '/:customerId/open-folder',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;

    // Get customer with media folder
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        mediaFolders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            mediaFolder: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Get folder path from mediaFolders or flight's mediaFolder
    let folderPath = customer.mediaFolders[0]?.folderPath ||
                     customer.flights[0]?.mediaFolder?.folderPath;

    if (!folderPath) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'FOLDER_NOT_FOUND');
    }

    // Make absolute path - use process.cwd() which is packages/api when running dev
    const absolutePath = path.resolve(process.cwd(), folderPath);

    // Check if folder exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new AppError('Klasör bulunamadı: ' + absolutePath, 404, 'FOLDER_NOT_EXISTS');
    }

    // Open in Finder (macOS) or file explorer (Windows/Linux)
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = `open "${absolutePath}"`;
    } else if (platform === 'win32') {
      command = `explorer "${absolutePath}"`;
    } else {
      command = `xdg-open "${absolutePath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error('Failed to open folder:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Klasör açılamadı' },
        });
      }

      res.json({
        success: true,
        message: 'Klasör açıldı',
        data: { path: absolutePath },
      });
    });
  })
);

export default router;

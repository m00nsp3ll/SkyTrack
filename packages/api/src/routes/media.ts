import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getMediaFolderPath,
  ensureFolderStructure,
  listMediaFiles,
  getDiskStats,
  getTodayMediaStats,
  sanitizePilotName,
  formatDateForFolder,
} from '../services/media.js';
import { qnap } from '../services/qnapService.js';

const router = Router();
const prisma = new PrismaClient();

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';

// Multer configuration for file uploads
const storage = multer.memoryStorage();

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
      'image/heic',
      'image/heif',
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

// Helper: parse date filter params
function parseDateRange(query: any): { dateFrom: Date; dateTo: Date; prevFrom: Date; prevTo: Date } {
  const { date = 'today', startDate: qStart, endDate: qEnd } = query;
  const now = new Date();
  let dateFrom: Date, dateTo: Date, prevFrom: Date, prevTo: Date;

  if (qStart && qEnd) {
    dateFrom = new Date(qStart as string); dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(qEnd as string); dateTo.setHours(23, 59, 59, 999);
    const diffMs = dateTo.getTime() - dateFrom.getTime();
    prevTo = new Date(dateFrom.getTime() - 1); prevTo.setHours(23, 59, 59, 999);
    prevFrom = new Date(prevTo.getTime() - diffMs); prevFrom.setHours(0, 0, 0, 0);
  } else if (date === 'week') {
    dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    prevTo = new Date(dateFrom.getTime() - 1); prevTo.setHours(23, 59, 59, 999);
    prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - 6); prevFrom.setHours(0, 0, 0, 0);
  } else if (date === 'month') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else {
    dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    prevFrom = new Date(dateFrom); prevFrom.setDate(prevFrom.getDate() - 1);
    prevTo = new Date(prevFrom); prevTo.setHours(23, 59, 59, 999);
  }
  return { dateFrom, dateTo, prevFrom, prevTo };
}

// GET /api/media/dashboard - Foto/Video dashboard istatistikleri (tarih filtreli)
router.get(
  '/dashboard',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { dateFrom, dateTo, prevFrom, prevTo } = parseDateRange(req.query);
    const now = new Date();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [periodSales, prevSales, monthSales, lastMonthSales, periodFlights, periodFolders] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo }, itemType: { in: ['Foto/Video', 'MEDIA'] } },
        select: { totalAmountEUR: true, totalPrice: true, paymentStatus: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: prevFrom, lte: prevTo }, itemType: { in: ['Foto/Video', 'MEDIA'] } },
        select: { totalAmountEUR: true, totalPrice: true, paymentStatus: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: monthStart, lte: dateTo }, itemType: { in: ['Foto/Video', 'MEDIA'] }, paymentStatus: 'PAID' },
        select: { totalAmountEUR: true, totalPrice: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, itemType: { in: ['Foto/Video', 'MEDIA'] }, paymentStatus: 'PAID' },
        select: { totalAmountEUR: true, totalPrice: true },
      }),
      prisma.flight.count({
        where: { createdAt: { gte: dateFrom, lte: dateTo }, status: 'COMPLETED' },
      }),
      prisma.mediaFolder.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        select: { paymentStatus: true, deliveryStatus: true },
      }),
    ]);

    const periodPaid = periodSales.filter(s => s.paymentStatus === 'PAID');
    const prevPaid = prevSales.filter(s => s.paymentStatus === 'PAID');

    const periodRevenue = periodPaid.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
    const prevRevenue = prevPaid.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    const soldCount = periodPaid.length;
    const prevSoldCount = prevPaid.length;

    const deliveredCount = periodFolders.filter(f => f.deliveryStatus === 'DELIVERED').length;
    const waitingCount = periodFolders.filter(f => f.paymentStatus === 'PAID' && f.deliveryStatus !== 'DELIVERED').length;

    const saleRatio = periodFlights > 0 ? Math.round((soldCount / periodFlights) * 100) : 0;

    const monthTotal = monthSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
    const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    const revenueChange = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const soldCountChange = prevSoldCount > 0 ? Math.round(((soldCount - prevSoldCount) / prevSoldCount) * 100) : 0;
    const monthChange = lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

    res.json({
      success: true,
      data: {
        todaySoldCount: soldCount,
        todayRevenue: periodRevenue,
        deliveredToday: deliveredCount,
        waitingToday: waitingCount,
        saleRatio,
        todayFlights: periodFlights,
        monthTotal,
        soldCountChange,
        revenueChange,
        monthChange,
      },
    });
  })
);

// GET /api/media/dashboard/cashbox - Kasa raporu (para birimi dağılımı)
router.get(
  '/dashboard/cashbox',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { dateFrom, dateTo } = parseDateRange(req.query);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        itemType: { in: ['Foto/Video', 'MEDIA'] },
        paymentStatus: 'PAID',
      },
      include: { paymentDetails: true },
    });

    // Group by currency → paymentMethod
    const cashbox: Record<string, Record<string, number>> = {};
    let grandTotal = 0;

    for (const sale of sales) {
      if (sale.paymentDetails && sale.paymentDetails.length > 0) {
        for (const pd of sale.paymentDetails) {
          if (!cashbox[pd.currency]) cashbox[pd.currency] = {};
          cashbox[pd.currency][pd.paymentMethod] = (cashbox[pd.currency][pd.paymentMethod] || 0) + pd.amount;
        }
      } else {
        const cur = sale.primaryCurrency || 'EUR';
        const method = sale.paymentMethod || 'CASH';
        if (!cashbox[cur]) cashbox[cur] = {};
        cashbox[cur][method] = (cashbox[cur][method] || 0) + sale.totalPrice;
      }
      grandTotal += (sale.totalAmountEUR || sale.totalPrice);
    }

    const currencies = Object.entries(cashbox).map(([currency, methods]) => ({
      currency,
      methods: Object.entries(methods).map(([method, amount]) => ({ method, amount })),
      total: Object.values(methods).reduce((s, v) => s + v, 0),
    }));

    res.json({
      success: true,
      data: { currencies, grandTotalEUR: grandTotal, saleCount: sales.length },
    });
  })
);

// GET /api/media/dashboard/chart - Grafik verileri
router.get(
  '/dashboard/chart',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const [sales, flights] = await Promise.all([
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startDate, lt: tomorrow },
          itemType: { in: ['Foto/Video', 'MEDIA'] },
          paymentStatus: 'PAID',
        },
        select: { totalAmountEUR: true, totalPrice: true, createdAt: true },
      }),
      prisma.flight.findMany({
        where: {
          createdAt: { gte: startDate, lt: tomorrow },
          status: 'COMPLETED',
        },
        select: { createdAt: true },
      }),
    ]);

    // Günlük veri
    const dailyData: { date: string; revenue: number; sold: number; flights: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (let d = new Date(startDate); d < tomorrow; d = new Date(d.getTime() + dayMs)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d.getTime() + dayMs);
      const dateStr = d.toISOString().split('T')[0];

      const daySales = sales.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd);
      const dayFlights = flights.filter(f => f.createdAt >= dayStart && f.createdAt < dayEnd);

      dailyData.push({
        date: dateStr,
        revenue: daySales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
        sold: daySales.length,
        flights: dayFlights.length,
      });
    }

    // Toplam alan vs almayan
    const totalFlights = flights.length;
    const totalSold = sales.length;
    const totalNotSold = Math.max(0, totalFlights - totalSold);

    res.json({
      success: true,
      data: {
        dailyData,
        pieData: {
          sold: totalSold,
          notSold: totalNotSold,
        },
      },
    });
  })
);

// GET /api/media/sales - Müşteri foto/video satış listesi (tablo)
router.get(
  '/sales',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const {
      date = 'today',
      startDate,
      endDate,
      payment = 'all',
      delivery = 'all',
      pilot: pilotId,
      search,
      page = '1',
      limit = '20',
      sortBy = 'flightTime',
      sortOrder = 'desc',
    } = req.query;

    // Date range
    let dateFrom: Date;
    let dateTo: Date;

    const now = new Date();
    if (startDate && endDate) {
      dateFrom = new Date(startDate as string);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(endDate as string);
      dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'week') {
      dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 7);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
    } else {
      // today
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
    }

    // Build flight query
    const flightWhere: any = {
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { in: ['COMPLETED', 'IN_FLIGHT'] },
    };
    if (pilotId) {
      flightWhere.pilotId = pilotId as string;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Get all flights in range
    const allFlights = await prisma.flight.findMany({
      where: flightWhere,
      include: {
        customer: {
          select: { id: true, displayId: true, firstName: true, lastName: true, phone: true, email: true, weight: true },
        },
        pilot: {
          select: { id: true, name: true },
        },
        mediaFolder: {
          select: { id: true, folderPath: true, fileCount: true, paymentStatus: true, deliveryStatus: true },
        },
      },
      orderBy: sortBy === 'flightTime' ? { takeoffAt: sortOrder === 'asc' ? 'asc' : 'desc' } : { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' },
    });

    // Get media sales for these customers
    const customerIds = allFlights.map(f => f.customerId);
    const mediaSales = await prisma.sale.findMany({
      where: {
        customerId: { in: customerIds },
        itemType: { in: ['Foto/Video', 'MEDIA'] },
      },
      include: {
        soldBy: { select: { id: true, username: true, name: true } },
        paymentDetails: true,
      },
    });

    // Map sales to customers
    const salesByCustomer = new Map<string, typeof mediaSales[0]>();
    for (const sale of mediaSales) {
      if (sale.customerId) {
        salesByCustomer.set(sale.customerId, sale);
      }
    }

    // Combine data
    let rows = allFlights.map(flight => {
      const sale = salesByCustomer.get(flight.customerId) || null;
      return {
        flightId: flight.id,
        customer: flight.customer,
        pilot: flight.pilot,
        flightTime: flight.takeoffAt,
        flightDuration: flight.durationMinutes,
        flightStatus: flight.status,
        mediaFolder: flight.mediaFolder,
        sale: sale ? {
          id: sale.id,
          itemName: sale.itemName,
          totalPrice: sale.totalPrice,
          totalAmountEUR: sale.totalAmountEUR,
          primaryCurrency: sale.primaryCurrency,
          paymentStatus: sale.paymentStatus,
          paymentMethod: sale.paymentMethod,
          soldBy: sale.soldBy,
          paymentDetails: sale.paymentDetails,
          createdAt: sale.createdAt,
        } : null,
      };
    });

    // Apply filters
    if (payment !== 'all') {
      if (payment === 'paid') {
        rows = rows.filter(r => r.sale?.paymentStatus === 'PAID');
      } else if (payment === 'unpaid') {
        rows = rows.filter(r => !r.sale || r.sale.paymentStatus === 'UNPAID');
      }
    }
    if (delivery !== 'all') {
      if (delivery === 'delivered') {
        rows = rows.filter(r => r.mediaFolder?.deliveryStatus === 'DELIVERED');
      } else if (delivery === 'waiting') {
        rows = rows.filter(r => r.mediaFolder && r.mediaFolder.paymentStatus === 'PAID' && r.mediaFolder.deliveryStatus !== 'DELIVERED');
      }
    }
    if (search) {
      const s = (search as string).toLowerCase();
      rows = rows.filter(r =>
        r.customer.displayId.toLowerCase().includes(s) ||
        r.customer.firstName.toLowerCase().includes(s) ||
        r.customer.lastName.toLowerCase().includes(s) ||
        r.pilot.name.toLowerCase().includes(s)
      );
    }

    const totalCount = rows.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const paginatedRows = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      data: paginatedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
      },
    });
  })
);

// GET /api/media/staff-summary - Satış personeli foto/video özeti
router.get(
  '/staff-summary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { date = 'today', startDate, endDate } = req.query;

    let dateFrom: Date;
    let dateTo: Date;
    const now = new Date();

    if (startDate && endDate) {
      dateFrom = new Date(startDate as string); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(endDate as string); dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'week') {
      dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else {
      dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    }

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        itemType: { in: ['Foto/Video', 'MEDIA'] },
      },
      include: {
        soldBy: { select: { id: true, username: true, name: true } },
      },
    });

    const staffMap = new Map<string, { id: string; name: string; count: number; totalEUR: number; paidEUR: number; unpaidEUR: number }>();

    for (const sale of sales) {
      const staffId = sale.soldById;
      const existing = staffMap.get(staffId) || {
        id: staffId,
        name: sale.soldBy.name || sale.soldBy.username,
        count: 0,
        totalEUR: 0,
        paidEUR: 0,
        unpaidEUR: 0,
      };
      existing.count++;
      const eur = sale.totalAmountEUR || sale.totalPrice;
      existing.totalEUR += eur;
      if (sale.paymentStatus === 'PAID') existing.paidEUR += eur;
      else existing.unpaidEUR += eur;
      staffMap.set(staffId, existing);
    }

    res.json({
      success: true,
      data: Array.from(staffMap.values()).sort((a, b) => b.totalEUR - a.totalEUR),
    });
  })
);

// GET /api/media/pilot-summary - Pilot bazlı medya özeti
router.get(
  '/pilot-summary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { date = 'today', startDate, endDate } = req.query;

    let dateFrom: Date;
    let dateTo: Date;
    const now = new Date();

    if (startDate && endDate) {
      dateFrom = new Date(startDate as string); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(endDate as string); dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'week') {
      dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else if (date === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    } else {
      dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999);
    }

    const flights = await prisma.flight.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        status: { in: ['COMPLETED', 'IN_FLIGHT'] },
      },
      include: {
        pilot: { select: { id: true, name: true } },
        mediaFolder: { select: { fileCount: true, paymentStatus: true, deliveryStatus: true } },
      },
    });

    // Get all media sales for these flights' customers
    const customerIds = flights.map(f => f.customerId);
    const mediaSales = await prisma.sale.findMany({
      where: {
        customerId: { in: customerIds },
        itemType: { in: ['Foto/Video', 'MEDIA'] },
        paymentStatus: 'PAID',
      },
      select: { customerId: true },
    });
    const paidCustomerIds = new Set(mediaSales.map(s => s.customerId));

    const pilotMap = new Map<string, { id: string; name: string; totalFlights: number; mediaSold: number; filesUploaded: number; waitingUpload: number }>();

    for (const flight of flights) {
      const pilotId = flight.pilotId;
      const existing = pilotMap.get(pilotId) || {
        id: pilotId,
        name: flight.pilot.name,
        totalFlights: 0,
        mediaSold: 0,
        filesUploaded: 0,
        waitingUpload: 0,
      };
      existing.totalFlights++;
      if (paidCustomerIds.has(flight.customerId)) existing.mediaSold++;
      if (flight.mediaFolder) {
        existing.filesUploaded += flight.mediaFolder.fileCount;
        if (flight.mediaFolder.fileCount === 0) existing.waitingUpload++;
      } else {
        existing.waitingUpload++;
      }
      pilotMap.set(pilotId, existing);
    }

    res.json({
      success: true,
      data: Array.from(pilotMap.values()).sort((a, b) => b.totalFlights - a.totalFlights),
    });
  })
);

// POST /api/media/pilot/:pilotId/open-folder - Pilot klasörü SMB path döndür
router.post(
  '/pilot/:pilotId/open-folder',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { pilotId } = req.params;
    const { date } = req.body;

    const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
    if (!pilot) {
      throw new AppError('Pilot bulunamadı', 404, 'PILOT_NOT_FOUND');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const safePilotName = sanitizePilotName(pilot.name);
    const folderDate = formatDateForFolder(targetDate);
    const nasIp = process.env.QNAP_LAN_IP || '192.168.1.105';

    // smb://192.168.1.105/skytrack-media/2026-03-28/Ahmet_Yilmaz
    const smbPath = `smb://${nasIp}/skytrack-media/${folderDate}/${safePilotName}`;
    const uncPath = `\\\\${nasIp}\\skytrack-media\\${folderDate}\\${safePilotName}`;

    res.json({ success: true, data: { smbPath, uncPath }, message: 'SMB path hazır' });
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
            takeoffAt: true,
            landingAt: true,
            durationMinutes: true,
          },
        },
      },
    });

    const hasMore = folders.length > take;
    const data = hasMore ? folders.slice(0, -1) : folders;

    // Fetch media sales for each customer
    const customerIds = data.map(f => f.customerId);
    const mediaSales = await prisma.sale.findMany({
      where: {
        customerId: { in: customerIds },
        itemType: 'Foto/Video',
      },
      select: {
        id: true,
        customerId: true,
        itemName: true,
        totalPrice: true,
        totalAmountEUR: true,
        primaryCurrency: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        soldBy: {
          select: { id: true, username: true },
        },
      },
    });

    // Attach sale to each folder
    const dataWithSales = data.map(folder => ({
      ...folder,
      mediaSale: mediaSales.find(s => s.customerId === folder.customerId) || null,
    }));

    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    res.json({
      success: true,
      data: dataWithSales,
      pagination: {
        hasMore,
        nextCursor,
        count: dataWithSales.length,
      },
    });
  })
);

// ==========================================
// DYNAMIC ROUTES (with :customerId parameter)
// ==========================================

// POST /api/media/upload/:customerId - Upload files for a customer (NAS üzerinden)
router.post(
  '/upload/:customerId',
  authenticate,
  upload.array('files', 50),
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
          include: { pilot: true, mediaFolder: true },
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

    // NAS'ta hedef klasörü belirle
    let nasRelativePath: string;

    if (latestFlight.mediaFolder) {
      // DB'deki folderPath'ten NAS relative path'ini çıkar
      nasRelativePath = latestFlight.mediaFolder.folderPath.replace(/^media\//, '');
    } else {
      // NAS'ta displayId klasörünü ara
      const found = await qnap.findCustomerFolder(customer.displayId);
      if (found) {
        nasRelativePath = found;
      } else {
        // Yoksa yeni klasör oluştur
        const flightDate = latestFlight.createdAt.toISOString().split('T')[0];
        const pilotName = latestFlight.pilot?.name || 'unknown';
        const safePilot = pilotName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ-]/g, '');
        nasRelativePath = `${flightDate}/${safePilot}/${customer.displayId}`;
      }
    }

    // Dosyaları NAS'a yükle
    let uploaded = 0;
    const errors: string[] = [];

    for (const file of files) {
      const remotePath = `${nasRelativePath}/${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const ok = await qnap.uploadBuffer(file.buffer, remotePath);
      if (ok) {
        uploaded++;
      } else {
        errors.push(file.originalname);
      }
    }

    if (uploaded === 0) {
      throw new AppError('Dosyalar NAS\'a yüklenemedi', 500, 'UPLOAD_FAILED');
    }

    // NAS'taki dosya sayısını tara ve DB'yi güncelle
    const nasFiles = await qnap.listFilesDetailed(nasRelativePath);
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.heic', '.heif'];
    const mediaCount = nasFiles.filter(f => !f.isFolder && mediaExtensions.some(ext => f.name.toLowerCase().endsWith(ext))).length;
    const totalSize = nasFiles.filter(f => !f.isFolder).reduce((s, f) => s + f.size, 0);

    const folderPath = `media/${nasRelativePath}`;

    await prisma.mediaFolder.upsert({
      where: { flightId: latestFlight.id },
      create: {
        flightId: latestFlight.id,
        customerId: customer.id,
        pilotId: latestFlight.pilotId,
        folderPath,
        fileCount: mediaCount,
        totalSizeBytes: BigInt(totalSize),
        paymentStatus: 'PENDING',
        deliveryStatus: 'PENDING',
      },
      update: {
        fileCount: mediaCount,
        totalSizeBytes: BigInt(totalSize),
        folderPath,
      },
    });

    res.json({
      success: true,
      data: { uploaded, errors },
      message: `${uploaded} dosya NAS'a yüklendi`,
    });
  })
);

// POST /api/media/:customerId/scan - Scan QNAP NAS and update DB
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
          include: { pilot: true, mediaFolder: true },
        },
      },
    });

    if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    const latestFlight = customer.flights[0];
    if (!latestFlight) throw new AppError('Müşterinin uçuşu bulunamadı', 404, 'FLIGHT_NOT_FOUND');

    const displayId = customer.displayId;
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.heic', '.heif'];
    const nasBase = process.env.QNAP_MEDIA_PATH || '/share/skytrack-media';

    // QNAP'ta klasördeki medya dosyalarını say (recursive 1 seviye)
    const countNasFiles = async (relativePath: string): Promise<{ count: number; size: number }> => {
      let count = 0;
      let size = 0;
      try {
        const items = await qnap.listFilesDetailed(relativePath);
        for (const f of items) {
          if (f.isFolder) {
            // Alt klasörlere de gir (sorti klasörleri vb.)
            const sub = await countNasFiles(`${relativePath}/${f.name}`).catch(() => ({ count: 0, size: 0 }));
            count += sub.count;
            size += sub.size;
          } else if (mediaExtensions.some(ext => f.name.toLowerCase().endsWith(ext))) {
            count++;
            size += f.size;
          }
        }
      } catch { /* */ }
      return { count, size };
    };

    let processed = 0;
    let totalSize = 0;
    let foundNasPath = '';

    // DB'deki folderPath geçerliyse önce orada ara
    const dbPath = latestFlight.mediaFolder?.folderPath || '';
    const relativePath = dbPath
      .replace(`${nasBase}/`, '')
      .replace(/^media\//, '')
      .trim();

    // Geçerli bir path mi? (boş, '.', 'undefined' gibi değerleri atla)
    const isValidRelPath = relativePath.length > 2 && relativePath !== '.' && !relativePath.startsWith('.');

    if (isValidRelPath) {
      const result = await countNasFiles(relativePath);
      if (result.count > 0) {
        processed = result.count;
        totalSize = result.size;
        foundNasPath = relativePath;
      }
    }

    // Bulunamadıysa — NAS'ta SSH find ile displayId klasörünü ara
    if (processed === 0) {
      const nasRelative = await qnap.findCustomerFolder(displayId);
      if (nasRelative && nasRelative !== '.' && nasRelative.length > 2) {
        const result = await countNasFiles(nasRelative);
        processed = result.count;
        totalSize = result.size;
        if (result.count > 0) foundNasPath = nasRelative;
      }
    }

    // DB'ye yazılacak folderPath: NAS relative path'i "media/..." formatında sakla
    // Sadece gerçek klasör bulunduysa güncelle — yanlış "media/." gibi değerleri yazma
    const finalFolderPath = foundNasPath ? `media/${foundNasPath}` : null;

    if (latestFlight.mediaFolder) {
      await prisma.mediaFolder.update({
        where: { id: latestFlight.mediaFolder.id },
        data: {
          fileCount: processed,
          totalSizeBytes: BigInt(totalSize),
          ...(finalFolderPath ? { folderPath: finalFolderPath } : {}),
        },
      });
    } else if (processed > 0 && finalFolderPath) {
      await prisma.mediaFolder.create({
        data: {
          customerId: customer.id,
          pilotId: latestFlight.pilotId,
          flightId: latestFlight.id,
          folderPath: finalFolderPath,
          fileCount: processed,
          totalSizeBytes: BigInt(totalSize),
          paymentStatus: 'PENDING',
          deliveryStatus: 'PENDING',
        },
      });
    }

    res.json({
      success: true,
      data: { processed, totalSize, foundPath: finalFolderPath },
      message: processed > 0 ? `${processed} dosya bulundu` : 'NAS klasöründe medya dosyası bulunamadı',
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

    // Calculate sorti number: how many completed flights the pilot had up to and including this flight
    let sortiNumber: number | null = null;
    if (latestFlight) {
      const flightDate = new Date(latestFlight.createdAt);
      const dayStart = new Date(flightDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(flightDate);
      dayEnd.setHours(23, 59, 59, 999);
      sortiNumber = await prisma.flight.count({
        where: {
          pilotId: latestFlight.pilotId,
          createdAt: { gte: dayStart, lte: latestFlight.createdAt },
        },
      });
    }

    // Check for unpaid Foto/Video sale
    const unpaidMediaSale = await prisma.sale.findFirst({
      where: { customerId: customer.id, itemType: 'Foto/Video', paymentStatus: 'UNPAID' },
      select: { id: true },
    });

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
          sortiNumber,
          assignedAt: latestFlight.createdAt,
          pickupAt: (latestFlight as any).pickupAt,
          takeoffAt: latestFlight.takeoffAt,
          landingAt: latestFlight.landingAt,
          durationMinutes: (latestFlight as any).durationMinutes,
        } : null,
        mediaFolder: mediaFolder ? {
          id: mediaFolder.id,
          folderPath: mediaFolder.folderPath,
          fileCount: mediaFolder.fileCount,
          totalSizeBytes: Number(mediaFolder.totalSizeBytes),
          paymentStatus: mediaFolder.paymentStatus,
          deliveryStatus: mediaFolder.deliveryStatus,
        } : null,
        hasPendingMediaSale: !!unpaidMediaSale,
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
          include: { mediaFolder: true, pilot: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    const mediaFolder = customer.flights[0]?.mediaFolder;
    const displayId = customer.displayId;
    const pilotName = customer.flights[0]?.pilot?.name || '';
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.heic', '.heif'];

    const { sanitizePilotName: spn } = await import('../services/media.js');
    const sanitizedPilot = spn(pilotName);

    // Tarihi belirle
    let dateIso = new Date().toISOString().split('T')[0];
    if (mediaFolder?.folderPath) {
      const rel = mediaFolder.folderPath.replace(/^media\//, '');
      const isoMatch = rel.match(/^(\d{4}-\d{2}-\d{2})/);
      const ddMatch = rel.match(/^(\d{2})-(\d{2})-(\d{4})/);
      if (isoMatch) dateIso = isoMatch[1];
      else if (ddMatch) dateIso = `${ddMatch[3]}-${ddMatch[2]}-${ddMatch[1]}`;
    }

    // Tüm olası yolları dene (sorti klasörlü formatlar dahil)
    const pathsToTry: string[] = [];

    // Önce findCustomerFolder ile NAS'ta recursive ara
    const foundBySearch = await qnap.findCustomerFolder(displayId);
    if (foundBySearch) pathsToTry.push(foundBySearch);

    // DB'deki folderPath
    if (mediaFolder?.folderPath) pathsToTry.push(mediaFolder.folderPath.replace(/^media\//, ''));

    // Sanitize edilmiş pilot adı ile ara
    pathsToTry.push(
      `${dateIso}/${sanitizedPilot}/${displayId}`,
      `${dateIso}/${sanitizedPilot}`,
    );

    let nasFiles: Array<{ name: string; size: number; isFolder: boolean; modified: string }> = [];
    let foundPath = '';

    for (const tryPath of pathsToTry) {
      try {
        const exists = await qnap.folderExists(tryPath);
        if (!exists) continue;

        const hasDisplayId = tryPath.includes(displayId);
        if (hasDisplayId) {
          nasFiles = await qnap.listFilesDetailed(tryPath);
          foundPath = tryPath;
          // Alt klasörlerdeki dosyaları da ekle
          for (const sub of nasFiles.filter(f => f.isFolder)) {
            try {
              const subFiles = await qnap.listFilesDetailed(`${tryPath}/${sub.name}`);
              nasFiles.push(...subFiles.filter(f => !f.isFolder));
            } catch { /* */ }
          }
          break;
        } else {
          // Pilot klasöründe displayId klasörünü ara
          const items = await qnap.listFilesDetailed(tryPath);
          if (items.find(f => f.isFolder && f.name === displayId)) {
            nasFiles = await qnap.listFilesDetailed(`${tryPath}/${displayId}`);
            foundPath = `${tryPath}/${displayId}`;
            for (const sub of nasFiles.filter(f => f.isFolder)) {
              try {
                const subFiles = await qnap.listFilesDetailed(`${foundPath}/${sub.name}`);
                nasFiles.push(...subFiles.filter(f => !f.isFolder));
              } catch { /* */ }
            }
            break;
          }
          // Sorti klasörlerinde ara (hem "Sorti" hem "sorti" formatı)
          for (const sf of items.filter(f => f.isFolder && f.name.toLowerCase().includes('sorti'))) {
            try {
              const sfExists = await qnap.folderExists(`${tryPath}/${sf.name}/${displayId}`);
              if (sfExists) {
                nasFiles = await qnap.listFilesDetailed(`${tryPath}/${sf.name}/${displayId}`);
                foundPath = `${tryPath}/${sf.name}/${displayId}`;
                break;
              }
            } catch { /* */ }
          }
          if (nasFiles.length > 0) break;
        }
      } catch { /* */ }
    }

    // Medya dosyalarını filtrele ve formata dönüştür
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    };

    const filesWithUrls = nasFiles
      .filter(f => !f.isFolder && mediaExtensions.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => {
        const ext = path.extname(f.name).toLowerCase();
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        return {
          filename: f.name,
          originalName: f.name,
          path: `${foundPath}/${f.name}`,
          size: f.size,
          mimeType,
          type: mimeType.startsWith('video/') ? 'video' : 'photo',
          createdAt: f.modified || new Date().toISOString(),
          url: '',
        };
      });

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        totalSize: filesWithUrls.reduce((sum, f) => sum + f.size, 0),
        paymentStatus: mediaFolder?.paymentStatus || 'UNPAID',
        deliveryStatus: mediaFolder?.deliveryStatus || 'PENDING',
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

// GET /api/media/:customerId/download - NAS-side ZIP, redirect to direct HTTPS URL
// Eski akış: VDS dosyaları SSH ile çekip archiver ile streaming ZIP yapardı (yavaş, VDS bottleneck)
// Yeni akış: NAS'ta /usr/local/sbin/zip ile lokal disk hızında ZIP, müşteri NAS'tan direkt HTTPS ile alır
router.get(
  '/:customerId/download',
  asyncHandler(async (req: any, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');

    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');
    }

    const relPath = mediaFolder.folderPath.replace(/^media\//, '');

    // Best-effort cleanup — eski zipleri sil (24h)
    qnap.cleanupOldZips(24).catch(() => {});

    // NAS'ta zip oluştur
    const result = await qnap.createCustomerZip(customer.displayId, relPath);
    if (!result) {
      throw new AppError('ZIP oluşturulamadı', 500, 'ZIP_CREATE_FAILED');
    }

    // Delivery status güncelle
    await prisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: { deliveryStatus: 'DELIVERED' },
    });

    // NAS HTTPS URL'ine redirect — müşteri direkt NAS'tan indirir, VDS bypass
    const NAS_PUBLIC_URL = process.env.NAS_PUBLIC_URL || 'https://skytrack.myqnapcloud.com:8443';
    const downloadUrl = `${NAS_PUBLIC_URL}/${result.zipRelPath.split('/').map(encodeURIComponent).join('/')}`;
    res.redirect(302, downloadUrl);
  })
);

// GET /api/media/:customerId/prepare-zip - ZIP oluştur, path döndür (LAN indirme için)
router.get(
  '/:customerId/prepare-zip',
  asyncHandler(async (req: any, res: any) => {
    const { customerId } = req.params;
    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: { flights: { orderBy: { createdAt: 'desc' }, take: 1, include: { mediaFolder: true } } },
    });
    if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');
    if (mediaFolder.paymentStatus !== 'PAID') throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');

    const relPath = mediaFolder.folderPath.replace(/^media\//, '');
    const result = await qnap.createCustomerZip(customer.displayId, relPath);
    if (!result) throw new AppError('ZIP oluşturulamadı', 500, 'ZIP_CREATE_FAILED');

    await prisma.mediaFolder.update({ where: { id: mediaFolder.id }, data: { deliveryStatus: 'DELIVERED' } });

    res.json({ success: true, data: { zipRelPath: result.zipRelPath, size: result.size } });
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

// GET /api/media/:customerId/lan-info - NAS HTTP URL bilgisi (public, auth yok)
// Müşteri LAN'dayken NAS'tan direkt indirmek için dosya listesi ve URL'leri döner
router.get(
  '/:customerId/lan-info',
  asyncHandler(async (req: any, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');

    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');
    }

    const relPath = mediaFolder.folderPath.replace(/^media\//, '');

    // NAS SSH ile tüm medya dosyalarını recursive listele
    const mediaExt = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|webm|heic|heif)$/i;
    const allFileNames: string[] = [];

    const collectFiles = async (subPath: string) => {
      try {
        const items = await qnap.listFilesDetailed(subPath);
        for (const item of items) {
          if (item.isFolder) {
            await collectFiles(`${subPath}/${item.name}`);
          } else if (mediaExt.test(item.name)) {
            allFileNames.push(item.name);
          }
        }
      } catch { /* */ }
    };
    await collectFiles(relPath);

    // API üzerinden proxy URL döndür — HTTPS, SSL sorunu yok
    const apiBase = process.env.API_PUBLIC_URL || 'https://api.skytrackyp.com/api';
    const fileUrls = allFileNames.map(f => ({
      name: f,
      url: `${apiBase}/media/${customerId}/proxy-file/${encodeURIComponent(f)}`,
    }));

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: {
        fileCount: fileUrls.length,
        files: fileUrls,
      },
    });
  })
);

// GET /api/media/:customerId/proxy-file/:filename - NAS dosyasını API üzerinden stream et (public)
router.get(
  '/:customerId/proxy-file/:filename',
  asyncHandler(async (req: any, res: any) => {
    const { customerId, filename } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true },
        },
      },
    });

    if (!customer) throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');

    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) throw new AppError('Medya klasörü bulunamadı', 404, 'MEDIA_FOLDER_NOT_FOUND');

    if (mediaFolder.paymentStatus !== 'PAID') {
      throw new AppError('Ödeme yapılmadan indirilemez', 403, 'PAYMENT_REQUIRED');
    }

    const relPath = mediaFolder.folderPath.replace(/^media\//, '');
    const safeFilename = path.basename(decodeURIComponent(filename));

    // Dosyayı önce direkt klasörde, bulamazsa alt klasörlerde ara
    let nasFilePath = `${relPath}/${safeFilename}`;
    const findFile = async (subPath: string): Promise<string | null> => {
      try {
        const items = await qnap.listFilesDetailed(subPath);
        for (const item of items) {
          if (!item.isFolder && item.name === safeFilename) return `${subPath}/${safeFilename}`;
          if (item.isFolder) {
            const found = await findFile(`${subPath}/${item.name}`);
            if (found) return found;
          }
        }
      } catch { /* */ }
      return null;
    };
    const foundPath = await findFile(relPath);
    if (foundPath) nasFilePath = foundPath;

    const buffer = await qnap.downloadFile(nasFilePath);
    if (!buffer || buffer.length === 0) {
      throw new AppError('Dosya bulunamadı', 404, 'FILE_NOT_FOUND');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    };
    const mime = mimeMap[ext] || 'application/octet-stream';

    res.set('Content-Type', mime);
    res.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-store');
    res.send(buffer);
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
        paymentAmount: status === 'PAID' && amount ? amount : mediaFolder.paymentAmount,
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

// POST /api/media/:customerId/open-folder - Müşteri klasörü SMB path döndür
router.post(
  '/:customerId/open-folder',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { customerId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: {
        flights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { mediaFolder: true, pilot: true },
        },
      },
    }) as any;

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
    }

    // DB'den path al veya NAS'ta ara
    let nasPath = customer.flights[0]?.mediaFolder?.folderPath;
    if (!nasPath) {
      // NAS'ta recursive ara
      const found = await qnap.findCustomerFolder(customer.displayId);
      if (found) nasPath = found;
    }
    if (!nasPath) {
      // Pilot adıyla oluştur
      const pilot = customer.flights[0]?.pilot;
      if (pilot) {
        const safeName = sanitizePilotName(pilot.name);
        const dateStr = new Date().toISOString().split('T')[0];
        nasPath = `${dateStr}/${safeName}`;
      }
    }
    if (!nasPath) {
      throw new AppError('Medya klasörü bulunamadı', 404, 'FOLDER_NOT_FOUND');
    }

    const nasBase = process.env.QNAP_MEDIA_PATH || '/share/skytrack-media';
    const nasIp = process.env.QNAP_LAN_IP || '192.168.1.105';
    // folderPath olarak "media/01-04-2026/Pilot/A0001" veya "/share/skytrack-media/..." gelebilir
    let relativePart = nasPath.replace(`${nasBase}/`, '');
    // "media/" prefix'ini de temizle
    relativePart = relativePart.replace(/^media\//, '');
    const smbPath = `smb://${nasIp}/skytrack-media/${relativePart}`;
    // Windows UNC path: \\192.168.1.105\skytrack-media\...
    const uncPath = `\\\\${nasIp}\\skytrack-media\\${relativePart.replace(/\//g, '\\')}`;

    res.json({ success: true, data: { smbPath, uncPath }, message: 'SMB path hazır' });
  })
);

export default router;

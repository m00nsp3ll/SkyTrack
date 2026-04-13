import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { getDiskStats } from '../services/media.js';
import os from 'os';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reports/dashboard - Main dashboard data
router.get('/dashboard', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Parallel queries for performance
  const [
    customersToday,
    flightsToday,
    activeFlights,
    waitingFlights,
    salesToday,
    mediaFoldersToday,
  ] = await Promise.all([
    // Customers registered today
    prisma.customer.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    // Flights today
    prisma.flight.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { status: true, durationMinutes: true },
    }),
    // Active flights (in air)
    prisma.flight.count({
      where: { status: 'IN_FLIGHT' },
    }),
    // Waiting customers
    prisma.flight.count({
      where: { status: { in: ['ASSIGNED', 'PICKED_UP'] } },
    }),
    // Sales today (EUR bazlı)
    prisma.sale.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { totalPrice: true, totalAmountEUR: true, totalAmountTRY: true, primaryCurrency: true, paymentStatus: true, paymentMethod: true, itemType: true },
    }),
    // Media folders today
    prisma.mediaFolder.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { paymentStatus: true, paymentAmount: true, fileCount: true },
    }),
  ]);

  // Calculate stats — EUR bazlı
  const completedFlights = flightsToday.filter(f => f.status === 'COMPLETED');
  const paidSales = salesToday.filter(s => s.paymentStatus === 'PAID');

  const posRevenueEUR = paidSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const posRevenueTRY = paidSales.reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0);

  // Foto/Video geliri: sale tablosundan hesapla (eski 'MEDIA' kayıtları dahil)
  const mediaRevenue = paidSales
    .filter(s => s.itemType === 'Foto/Video' || s.itemType === 'MEDIA')
    .reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

  const mediaSoldCount = mediaFoldersToday.filter(m => m.paymentStatus === 'PAID').length;

  const unpaidEUR = salesToday
    .filter(s => s.paymentStatus === 'UNPAID')
    .reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const unpaidTRY = salesToday
    .filter(s => s.paymentStatus === 'UNPAID')
    .reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0);

  res.json({
    success: true,
    data: {
      cards: {
        totalCustomers: customersToday,
        totalFlights: flightsToday.length,
        completedFlights: completedFlights.length,
        activeFlights,
        waitingCustomers: waitingFlights,
        totalRevenue: posRevenueEUR + mediaRevenue,
        totalRevenueTRY: posRevenueTRY,
        mediaRevenue,
        mediaSoldCount,
        posRevenue: posRevenueEUR,
        posRevenueTRY,
        unpaidTotal: unpaidEUR,
        unpaidTotalTRY: unpaidTRY,
      },
      timestamp: new Date().toISOString(),
    },
  });
}));

// GET /api/reports/dashboard/charts - Chart data for dashboard
router.get('/dashboard/charts', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [flights, customers, sales] = await Promise.all([
    prisma.flight.findMany({
      where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, status: true },
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { createdAt: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: 'PAID' },
      select: { totalPrice: true, totalAmountEUR: true, paymentMethod: true, itemType: true },
    }),
  ]);

  // Hourly flight distribution (08:00-19:00)
  const hourlyFlights: { hour: number; count: number }[] = [];
  for (let h = 8; h <= 19; h++) {
    hourlyFlights.push({
      hour: h,
      count: flights.filter(f => f.createdAt.getHours() === h).length,
    });
  }

  // Hourly customer registration
  const hourlyCustomers: { hour: number; count: number }[] = [];
  for (let h = 8; h <= 19; h++) {
    hourlyCustomers.push({
      hour: h,
      count: customers.filter(c => c.createdAt.getHours() === h).length,
    });
  }

  // Revenue by type (Media vs POS) — EUR bazlı (eski 'MEDIA' kayıtları dahil)
  const mediaTotal = sales.filter(s => s.itemType === 'Foto/Video' || s.itemType === 'MEDIA').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const posTotal = sales.filter(s => s.itemType !== 'Foto/Video' && s.itemType !== 'MEDIA').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

  const revenueByType = [
    { name: 'Foto/Video', value: mediaTotal },
    { name: 'POS', value: posTotal },
  ];

  // Payment method distribution — EUR bazlı
  const paymentMethods = [
    { name: 'Nakit', value: sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0) },
    { name: 'Kart', value: sales.filter(s => s.paymentMethod === 'CREDIT_CARD').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0) },
    { name: 'Havale', value: sales.filter(s => s.paymentMethod === 'TRANSFER').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0) },
  ];

  res.json({
    success: true,
    data: {
      hourlyFlights,
      hourlyCustomers,
      revenueByType,
      paymentMethods,
    },
  });
}));

// GET /api/reports/dashboard/recent - Recent activities
router.get('/dashboard/recent', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const [recentCustomers, recentFlights, recentSales] = await Promise.all([
    prisma.customer.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        status: true,
      },
    }),
    prisma.flight.findMany({
      take: 10,
      where: { status: 'COMPLETED' },
      orderBy: { landingAt: 'desc' },
      select: {
        id: true,
        durationMinutes: true,
        landingAt: true,
        customer: { select: { displayId: true, firstName: true, lastName: true } },
        pilot: { select: { name: true } },
      },
    }),
    prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        itemName: true,
        totalPrice: true,
        totalAmountEUR: true,
        primaryCurrency: true,
        paymentStatus: true,
        createdAt: true,
        customer: { select: { displayId: true, firstName: true } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      recentCustomers,
      recentFlights,
      recentSales,
    },
  });
}));

// GET /api/reports/pilots - Pilot performance report
router.get('/pilots', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { from, to } = req.query;

  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  // Global pilotaj ücreti (TL)
  const feeSetting = await prisma.setting.findUnique({ where: { key: 'flightFee' } });
  const globalFlightFee = parseFloat(feeSetting?.value || '1000');

  // Global round counter
  const queueState = await prisma.queueState.findUnique({ where: { id: 'singleton' } });
  const currentRound = queueState?.currentRound || 0;

  const pilots = await prisma.pilot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      flightFee: true,
      forfeitCount: true,
      isTeamLeader: true,
      team: { select: { id: true, name: true, color: true } },
      flights: {
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: {
          status: true,
          durationMinutes: true,
          createdAt: true,
        },
      },
    },
  });

  const pilotStats = pilots.map(pilot => {
    const completedFlights = pilot.flights.filter(f => f.status === 'COMPLETED');
    const cancelledFlights = pilot.flights.filter(f => f.status === 'CANCELLED');
    const totalDuration = completedFlights.reduce((sum, f) => sum + (f.durationMinutes || 0), 0);

    // Count active days (days with at least one flight)
    const activeDays = new Set(
      pilot.flights.map(f => f.createdAt.toISOString().split('T')[0])
    ).size;

    // Pilotaj ücreti (pilota özel veya global)
    const flightFee = pilot.flightFee ? Number(pilot.flightFee) : globalFlightFee;
    const earnings = completedFlights.length * flightFee;

    return {
      id: pilot.id,
      name: pilot.name,
      tur: currentRound, // Mevcut tur sayısı
      totalFlights: completedFlights.length,
      flightFee,
      earnings,
      forfeitCount: pilot.forfeitCount,
      isTeamLeader: pilot.isTeamLeader,
      team: pilot.team,
      avgDuration: completedFlights.length > 0 ? Math.round(totalDuration / completedFlights.length) : 0,
      totalCustomers: pilot.flights.length,
      avgDailyFlights: activeDays > 0 ? (completedFlights.length / activeDays).toFixed(1) : '0',
      cancelledFlights: cancelledFlights.length,
      activeDays,
      performanceScore: activeDays > 0 ? (completedFlights.length / activeDays).toFixed(2) : '0',
    };
  });

  // Calculate fairness metrics
  const flightCounts = pilotStats.map(p => p.totalFlights);
  const maxFlights = Math.max(...flightCounts);
  const minFlights = Math.min(...flightCounts);
  const avgFlights = flightCounts.reduce((a, b) => a + b, 0) / flightCounts.length;
  const variance = flightCounts.reduce((sum, c) => sum + Math.pow(c - avgFlights, 2), 0) / flightCounts.length;
  const stdDev = Math.sqrt(variance);

  res.json({
    success: true,
    data: {
      pilots: pilotStats.sort((a, b) => b.totalFlights - a.totalFlights),
      currentRound,
      globalFlightFee,
      fairness: {
        maxMinDiff: maxFlights - minFlights,
        standardDeviation: stdDev.toFixed(2),
        balanceScore: avgFlights > 0 ? ((1 - stdDev / avgFlights) * 100).toFixed(1) : '100',
      },
      dateRange: { from: fromDate, to: toDate },
    },
  });
}));

// GET /api/reports/pilots/:pilotId/flights - Pilot flight detail
router.get('/pilots/:pilotId/flights', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { pilotId } = req.params;
  const { from, to } = req.query;

  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    select: { id: true, name: true },
  });

  if (!pilot) {
    throw new AppError('Pilot bulunamadı', 404);
  }

  const flights = await prisma.flight.findMany({
    where: {
      pilotId,
      status: { in: ['COMPLETED', 'CANCELLED'] },
      createdAt: { gte: fromDate, lte: toDate },
    },
    select: {
      id: true,
      status: true,
      takeoffAt: true,
      landingAt: true,
      durationMinutes: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          weight: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: {
      pilot,
      flights,
      dateRange: { from: fromDate, to: toDate },
    },
  });
}));

// GET /api/reports/revenue - Revenue report
router.get('/revenue', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { from, to } = req.query;

  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const [sales, mediaFolders] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: {
        totalPrice: true,
        totalAmountEUR: true,
        totalAmountTRY: true,
        primaryCurrency: true,
        paymentStatus: true,
        paymentMethod: true,
        itemType: true,
        createdAt: true,
        soldBy: {
          select: { id: true, username: true, name: true },
        },
      },
    }),
    prisma.mediaFolder.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: {
        paymentStatus: true,
        paymentAmount: true,
        createdAt: true,
      },
    }),
  ]);

  const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
  const unpaidSalesList = sales.filter(s => s.paymentStatus === 'UNPAID');
  const paidMedia = mediaFolders.filter(m => m.paymentStatus === 'PAID');

  // EUR bazlı toplamlar
  const totalPOS = paidSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const totalPOSTRY = paidSales.reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0);
  // Foto/Video geliri: sale tablosundan hesapla (eski 'MEDIA' kayıtları dahil)
  const totalMedia = paidSales
    .filter(s => s.itemType === 'Foto/Video' || s.itemType === 'MEDIA')
    .reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const totalUnpaid = unpaidSalesList.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const totalUnpaidTRY = unpaidSalesList.reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0);
  const totalRevenue = totalPOS + totalMedia;
  const totalRevenueTRY = totalPOSTRY;
  const collectionRate = (totalRevenue + totalUnpaid) > 0
    ? ((totalRevenue / (totalRevenue + totalUnpaid)) * 100).toFixed(1)
    : '100';

  // Category breakdown — EUR bazlı (eski 'MEDIA' kayıtlarını 'Foto/Video' olarak normalize et)
  const categories: Record<string, number> = {};
  paidSales.forEach(s => {
    const categoryName = s.itemType === 'MEDIA' ? 'Foto/Video' : s.itemType;
    categories[categoryName] = (categories[categoryName] || 0) + (s.totalAmountEUR || s.totalPrice);
  });

  // Daily trend — EUR bazlı
  const dailyTrend: { date: string; pos: number; media: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + dayMs)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayStart = new Date(d);
    const dayEnd = new Date(d.getTime() + dayMs);

    const dayPOS = paidSales
      .filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd)
      .reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    // Foto/Video geliri: sale tablosundan (eski 'MEDIA' kayıtları dahil)
    const dayMedia = paidSales
      .filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd && (s.itemType === 'Foto/Video' || s.itemType === 'MEDIA'))
      .reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    dailyTrend.push({ date: dateStr, pos: dayPOS, media: dayMedia });
  }

  // Top products — EUR bazlı (eski 'MEDIA' kayıtlarını normalize et)
  const productTotals: Record<string, number> = {};
  paidSales.forEach(s => {
    const key = s.itemType === 'MEDIA' ? 'Foto/Video' : s.itemType;
    productTotals[key] = (productTotals[key] || 0) + (s.totalAmountEUR || s.totalPrice);
  });
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => ({ name, total }));

  // Staff sales breakdown — EUR bazlı
  const staffSales: Record<string, { id: string; name: string; total: number; count: number }> = {};
  paidSales.forEach(s => {
    const staffId = s.soldBy.id;
    const staffName = s.soldBy.name || s.soldBy.username;
    if (!staffSales[staffId]) {
      staffSales[staffId] = { id: staffId, name: staffName, total: 0, count: 0 };
    }
    staffSales[staffId].total += (s.totalAmountEUR || s.totalPrice);
    staffSales[staffId].count += 1;
  });
  const topStaff = Object.values(staffSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue,
        totalRevenueTRY,
        mediaRevenue: totalMedia,
        posRevenue: totalPOS,
        posRevenueTRY: totalPOSTRY,
        collected: totalRevenue,
        uncollected: totalUnpaid,
        uncollectedTRY: totalUnpaidTRY,
        collectionRate,
      },
      categories,
      dailyTrend,
      topProducts,
      topStaff,
      dateRange: { from: fromDate, to: toDate },
    },
  });
}));

// GET /api/reports/customers - Customer flow report
router.get('/customers', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { from, to } = req.query;

  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const [customers, flights, sales] = await Promise.all([
    prisma.customer.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.flight.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { status: true, createdAt: true, takeoffAt: true, durationMinutes: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, paymentStatus: 'PAID' },
      select: { totalPrice: true, totalAmountEUR: true, customerId: true },
    }),
  ]);

  const completedFlights = flights.filter(f => f.status === 'COMPLETED');
  const cancelledFlights = flights.filter(f => f.status === 'CANCELLED');

  // Average wait time (registration to takeoff)
  const waitTimes = flights
    .filter(f => f.takeoffAt)
    .map(f => (f.takeoffAt!.getTime() - f.createdAt.getTime()) / 60000);
  const avgWaitTime = waitTimes.length > 0
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 0;

  // Average flight duration
  const durations = completedFlights.map(f => f.durationMinutes || 0).filter(d => d > 0);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Average spend per customer — EUR bazlı
  const customerSpend: Record<string, number> = {};
  sales.forEach(s => {
    if (s.customerId) {
      customerSpend[s.customerId] = (customerSpend[s.customerId] || 0) + (s.totalAmountEUR || s.totalPrice);
    }
  });
  const spendValues = Object.values(customerSpend);
  const avgSpend = spendValues.length > 0
    ? Math.round(spendValues.reduce((a, b) => a + b, 0) / spendValues.length)
    : 0;

  // Cancellation rate
  const cancelRate = flights.length > 0
    ? ((cancelledFlights.length / flights.length) * 100).toFixed(1)
    : '0';

  // Daily customer count
  const dailyCustomers: { date: string; count: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + dayMs)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayStart = new Date(d);
    const dayEnd = new Date(d.getTime() + dayMs);

    dailyCustomers.push({
      date: dateStr,
      count: customers.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd).length,
    });
  }

  // Hourly heatmap
  const hourlyHeatmap: Record<number, number> = {};
  for (let h = 8; h <= 19; h++) hourlyHeatmap[h] = 0;
  customers.forEach(c => {
    const hour = c.createdAt.getHours();
    if (hourlyHeatmap[hour] !== undefined) hourlyHeatmap[hour]++;
  });

  // Status distribution
  const statusDistribution = {
    completed: customers.filter(c => c.status === 'COMPLETED').length,
    cancelled: customers.filter(c => c.status === 'CANCELLED').length,
    registered: customers.filter(c => c.status === 'REGISTERED').length,
    assigned: customers.filter(c => c.status === 'ASSIGNED').length,
    inFlight: customers.filter(c => c.status === 'IN_FLIGHT').length,
  };

  res.json({
    success: true,
    data: {
      summary: {
        totalCustomers: customers.length,
        avgWaitTime,
        avgDuration,
        cancelRate,
        avgSpend,
      },
      dailyCustomers,
      hourlyHeatmap: Object.entries(hourlyHeatmap).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      })),
      statusDistribution,
      dateRange: { from: fromDate, to: toDate },
    },
  });
}));

// GET /api/reports/daily/:date - Daily operation report
router.get('/daily/:date', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { date } = req.params;

  const reportDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [customers, flights, sales, mediaFolders, pilots, products] = await Promise.all([
    prisma.customer.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { status: true },
    }),
    prisma.flight.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { pilot: { select: { id: true, name: true } } },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { totalPrice: true, totalAmountEUR: true, totalAmountTRY: true, primaryCurrency: true, paymentStatus: true, paymentMethod: true, itemType: true, itemName: true },
    }),
    prisma.mediaFolder.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { paymentStatus: true, paymentAmount: true, fileCount: true, deliveryStatus: true },
    }),
    prisma.pilot.findMany({
      where: { isActive: true },
      select: { id: true, name: true, dailyFlightCount: true },
    }),
    prisma.product.findMany({
      where: { stock: { not: null } },
      select: { id: true, name: true, stock: true, lowStockAlert: true },
    }),
  ]);

  // Customer summary
  const customerSummary = {
    registered: customers.length,
    completed: customers.filter(c => c.status === 'COMPLETED').length,
    cancelled: customers.filter(c => c.status === 'CANCELLED').length,
  };

  // Pilot summary
  const pilotSummary = flights.reduce((acc, f) => {
    const name = f.pilot.name;
    if (!acc[name]) acc[name] = { flights: 0, completed: 0 };
    acc[name].flights++;
    if (f.status === 'COMPLETED') acc[name].completed++;
    return acc;
  }, {} as Record<string, { flights: number; completed: number }>);

  // Flight summary
  const completedFlights = flights.filter(f => f.status === 'COMPLETED');
  const durations = completedFlights.map(f => f.durationMinutes || 0).filter(d => d > 0);
  const flightSummary = {
    total: flights.length,
    completed: completedFlights.length,
    cancelled: flights.filter(f => f.status === 'CANCELLED').length,
    avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
  };

  // Cash register summary — EUR bazlı
  const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
  const cashSummary = {
    cash: paidSales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    card: paidSales.filter(s => s.paymentMethod === 'CREDIT_CARD').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    transfer: paidSales.filter(s => s.paymentMethod === 'TRANSFER').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    unpaid: sales.filter(s => s.paymentStatus === 'UNPAID').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    total: paidSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
  };

  // Media summary — sale tablosundan hesapla (eski 'MEDIA' kayıtları dahil)
  const mediaFromSales = paidSales
    .filter(s => s.itemType === 'Foto/Video' || s.itemType === 'MEDIA');
  const mediaSummary = {
    uploaded: mediaFolders.length,
    sold: mediaFromSales.length,
    delivered: mediaFolders.filter(m => m.deliveryStatus === 'DELIVERED').length,
    revenue: mediaFromSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    totalFiles: mediaFolders.reduce((sum, m) => sum + m.fileCount, 0),
  };

  // POS summary by category — EUR bazlı (eski 'MEDIA' kayıtlarını normalize et)
  const posSummary: Record<string, number> = {};
  paidSales.forEach(s => {
    const categoryName = s.itemType === 'MEDIA' ? 'Foto/Video' : s.itemType;
    posSummary[categoryName] = (posSummary[categoryName] || 0) + (s.totalAmountEUR || s.totalPrice);
  });

  // Low stock products
  const lowStockProducts = products.filter(p => {
    const threshold = p.lowStockAlert ?? 5;
    return p.stock !== null && p.stock <= threshold;
  });

  res.json({
    success: true,
    data: {
      date: reportDate.toISOString().split('T')[0],
      customerSummary,
      pilotSummary,
      flightSummary,
      cashSummary,
      mediaSummary,
      posSummary,
      lowStockProducts,
    },
  });
}));

// GET /api/reports/compare - Period comparison
router.get('/compare', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { period1_from, period1_to, period2_from, period2_to } = req.query;

  if (!period1_from || !period1_to || !period2_from || !period2_to) {
    throw new AppError('Tüm tarih parametreleri gerekli', 400, 'MISSING_DATES');
  }

  const p1From = new Date(period1_from as string);
  const p1To = new Date(period1_to as string);
  const p2From = new Date(period2_from as string);
  const p2To = new Date(period2_to as string);

  const getStats = async (from: Date, to: Date) => {
    const [customers, flights, salesData] = await Promise.all([
      prisma.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.flight.count({ where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' } }),
      prisma.sale.findMany({
        where: { createdAt: { gte: from, lte: to }, paymentStatus: 'PAID' },
        select: { totalPrice: true, totalAmountEUR: true },
      }),
    ]);

    const totalEUR = salesData.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    return {
      customers,
      flights,
      revenue: totalEUR,
      transactions: salesData.length,
      avgSpend: salesData.length > 0 ? totalEUR / salesData.length : 0,
    };
  };

  const [period1, period2] = await Promise.all([
    getStats(p1From, p1To),
    getStats(p2From, p2To),
  ]);

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  res.json({
    success: true,
    data: {
      period1: { from: p1From, to: p1To, ...period1 },
      period2: { from: p2From, to: p2To, ...period2 },
      changes: {
        customers: calcChange(period1.customers, period2.customers),
        flights: calcChange(period1.flights, period2.flights),
        revenue: calcChange(period1.revenue, period2.revenue),
        avgSpend: calcChange(period1.avgSpend, period2.avgSpend),
      },
    },
  });
}));

// GET /api/reports/staff-sales - Staff sales performance report
router.get('/staff-sales', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { staffId, from, to } = req.query;

  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  // If specific staff requested
  if (staffId) {
    const [user, sales] = await Promise.all([
      prisma.user.findUnique({
        where: { id: staffId as string },
        select: { id: true, username: true, name: true, role: true },
      }),
      prisma.sale.findMany({
        where: {
          soldById: staffId as string,
          createdAt: { gte: fromDate, lte: toDate },
        },
        include: {
          customer: {
            select: { id: true, displayId: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      throw new AppError('Personel bulunamadı', 404, 'STAFF_NOT_FOUND');
    }

    const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
    const totalRevenue = paidSales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
    const totalUnpaid = sales.filter(s => s.paymentStatus === 'UNPAID').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);

    // Category breakdown — EUR bazlı (eski 'MEDIA' kayıtlarını normalize et)
    const categories: Record<string, { count: number; total: number }> = {};
    paidSales.forEach(s => {
      const categoryName = s.itemType === 'MEDIA' ? 'Foto/Video' : s.itemType;
      if (!categories[categoryName]) {
        categories[categoryName] = { count: 0, total: 0 };
      }
      categories[categoryName].count += s.quantity;
      categories[categoryName].total += (s.totalAmountEUR || s.totalPrice);
    });

    // Daily trend — EUR bazlı
    const dailySales: { date: string; amount: number; count: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + dayMs)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      const dayEnd = new Date(d.getTime() + dayMs);

      const daySales = paidSales.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd);
      dailySales.push({
        date: dateStr,
        amount: daySales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
        count: daySales.length,
      });
    }

    // Hourly distribution — EUR bazlı
    const hourlySales: Record<number, number> = {};
    for (let h = 8; h <= 19; h++) hourlySales[h] = 0;
    paidSales.forEach(s => {
      const hour = s.createdAt.getHours();
      if (hourlySales[hour] !== undefined) {
        hourlySales[hour] += (s.totalAmountEUR || s.totalPrice);
      }
    });

    // Payment method breakdown — EUR bazlı
    const paymentMethods = {
      CASH: paidSales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
      CREDIT_CARD: paidSales.filter(s => s.paymentMethod === 'CREDIT_CARD').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
      TRANSFER: paidSales.filter(s => s.paymentMethod === 'TRANSFER').reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
    };

    res.json({
      success: true,
      data: {
        staff: user,
        summary: {
          totalSales: sales.length,
          totalRevenue,
          totalUnpaid,
          avgSaleAmount: sales.length > 0 ? totalRevenue / paidSales.length : 0,
          collectionRate: (totalRevenue + totalUnpaid) > 0
            ? ((totalRevenue / (totalRevenue + totalUnpaid)) * 100).toFixed(1)
            : '100',
        },
        categories,
        dailySales,
        hourlySales: Object.entries(hourlySales).map(([hour, amount]) => ({
          hour: parseInt(hour),
          amount,
        })),
        paymentMethods,
        recentSales: sales.slice(0, 100),
        dateRange: { from: fromDate, to: toDate },
      },
    });
  } else {
    // All staff summary
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: {
        totalPrice: true,
        totalAmountEUR: true,
        paymentStatus: true,
        soldBy: {
          select: { id: true, username: true, name: true },
        },
      },
    });

    // EUR bazlı toplamlar
    const staffStats: Record<string, { name: string; total: number; count: number; paid: number }> = {};
    sales.forEach(s => {
      const staffId = s.soldBy.id;
      const staffName = s.soldBy.name || s.soldBy.username;
      if (!staffStats[staffId]) {
        staffStats[staffId] = { name: staffName, total: 0, count: 0, paid: 0 };
      }
      staffStats[staffId].count += 1;
      if (s.paymentStatus === 'PAID') {
        staffStats[staffId].total += (s.totalAmountEUR || s.totalPrice);
        staffStats[staffId].paid += 1;
      }
    });

    const staffList = Object.entries(staffStats).map(([id, stats]) => ({
      id,
      ...stats,
      avgSale: stats.paid > 0 ? stats.total / stats.paid : 0,
    })).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        staffList,
        dateRange: { from: fromDate, to: toDate },
      },
    });
  }
}));

// GET /api/reports/system - System status
router.get('/system', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const diskStats = await getDiskStats();

  // Get database size estimate
  const dbStats = await prisma.$queryRaw`
    SELECT pg_database_size(current_database()) as size
  ` as { size: bigint }[];

  const dbSize = Number(dbStats[0]?.size || 0);

  // Count records
  const [customerCount, flightCount, saleCount, mediaCount] = await Promise.all([
    prisma.customer.count(),
    prisma.flight.count(),
    prisma.sale.count(),
    prisma.mediaFolder.count(),
  ]);

  // System uptime
  const uptime = os.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);

  // Memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.json({
    success: true,
    data: {
      disk: {
        mediaSize: diskStats.mediaSize,
        mediaSizeFormatted: formatBytes(diskStats.mediaSize),
      },
      database: {
        size: dbSize,
        sizeFormatted: formatBytes(dbSize),
        records: {
          customers: customerCount,
          flights: flightCount,
          sales: saleCount,
          mediaFolders: mediaCount,
        },
      },
      system: {
        uptime: `${uptimeHours}s ${uptimeMinutes}dk`,
        memory: {
          total: formatBytes(totalMem),
          used: formatBytes(usedMem),
          free: formatBytes(freeMem),
          usagePercent: ((usedMem / totalMem) * 100).toFixed(1),
        },
        platform: os.platform(),
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    },
  });
}));

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;

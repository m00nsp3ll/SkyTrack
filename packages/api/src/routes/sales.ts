import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { convertAmount, getRate } from '../services/currencyService.js';

const router = Router();
const prisma = new PrismaClient();

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY';

// POST /api/sales - Create new sale(s)
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { customerId, items, paymentStatus, paymentMethod, primaryCurrency, paymentDetails } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('En az bir ürün gerekli', 400, 'NO_ITEMS');
  }

  const currency: Currency = primaryCurrency || 'EUR';
  const isSplitPayment = Array.isArray(paymentDetails) && paymentDetails.length > 0;

  const sales: any[] = [];

  // Transaction for multiple items
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const { productId, itemType, itemName, quantity, unitPrice } = item;

      // If productId provided, get product info
      let finalItemType = itemType;
      let finalItemName = itemName;
      let finalUnitPrice = unitPrice;
      let productCurrency: Currency = 'EUR';

      if (productId) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (product) {
          finalItemType = product.category;
          finalItemName = product.name;
          finalUnitPrice = product.price;
          productCurrency = product.priceCurrency as Currency;

          // Decrease stock if tracked
          if (product.stock !== null) {
            const newStock = product.stock - (quantity || 1);
            await tx.product.update({
              where: { id: productId },
              data: { stock: Math.max(0, newStock) },
            });
          }
        }
      }

      const totalPrice = finalUnitPrice * (quantity || 1);

      // Calculate EUR and TRY equivalents
      const eurAmount = productCurrency === 'EUR'
        ? totalPrice
        : convertAmount(totalPrice, productCurrency, 'EUR').converted;
      const tryAmount = productCurrency === 'TRY'
        ? totalPrice
        : convertAmount(totalPrice, productCurrency, 'TRY').converted;

      const sale = await tx.sale.create({
        data: {
          customerId: customerId || null,
          itemType: finalItemType,
          itemName: finalItemName,
          quantity: quantity || 1,
          unitPrice: finalUnitPrice,
          totalPrice,
          totalAmountEUR: eurAmount,
          totalAmountTRY: tryAmount,
          primaryCurrency: isSplitPayment ? currency : (paymentStatus === 'UNPAID' ? 'EUR' : currency),
          isSplitPayment,
          paymentStatus: paymentStatus || 'UNPAID',
          paymentMethod: paymentStatus === 'PAID' ? (paymentMethod || 'CASH') : null,
          soldById: req.user!.id,
        },
        include: {
          customer: {
            select: { id: true, displayId: true, firstName: true, lastName: true },
          },
          paymentDetails: true,
        },
      });

      // Create payment details if split payment
      if (isSplitPayment && paymentStatus === 'PAID') {
        for (const detail of paymentDetails) {
          const detailCurrency: Currency = detail.currency || 'EUR';
          const detailRate = getRate(detailCurrency, 'EUR');
          const detailAmountEUR = convertAmount(detail.amount, detailCurrency, 'EUR').converted;
          const detailAmountTRY = convertAmount(detail.amount, detailCurrency, 'TRY').converted;

          await tx.paymentDetail.create({
            data: {
              saleId: sale.id,
              currency: detailCurrency,
              amount: detail.amount,
              amountInEUR: detailAmountEUR,
              amountInTRY: detailAmountTRY,
              exchangeRate: detailRate.rate,
              exchangeSource: detailRate.source,
              paymentMethod: detail.paymentMethod || 'CASH',
            },
          });
        }
      } else if (paymentStatus === 'PAID' && !isSplitPayment) {
        // Single payment - create one PaymentDetail
        const rateInfo = getRate(currency, 'EUR');
        await tx.paymentDetail.create({
          data: {
            saleId: sale.id,
            currency,
            amount: totalPrice,
            amountInEUR: eurAmount,
            amountInTRY: tryAmount,
            exchangeRate: rateInfo.rate,
            exchangeSource: rateInfo.source,
            paymentMethod: paymentMethod || 'CASH',
          },
        });
      }

      sales.push(sale);
    }
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('sale:created', {
      count: sales.length,
      total: sales.reduce((sum, s) => sum + s.totalPrice, 0),
    });
  }

  res.status(201).json({
    success: true,
    data: sales,
    message: `${sales.length} ürün satışı kaydedildi`,
  });
}));

// GET /api/sales - List sales with pagination and filters
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const {
    customerId,
    paymentStatus,
    date,
    category,
    cursor,
    limit = '50'
  } = req.query;

  const take = Math.min(parseInt(limit as string) || 50, 100);
  const where: any = {};

  // Customer filter
  if (customerId) {
    where.customerId = customerId;
  }

  // Payment status filter
  if (paymentStatus && paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus;
  }

  // Category filter
  if (category && category !== 'all') {
    where.itemType = category;
  }

  // Date filter
  if (date) {
    const filterDate = new Date(date as string);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  const cursorOption = cursor ? { id: cursor as string } : undefined;

  const sales = await prisma.sale.findMany({
    where,
    take: take + 1,
    skip: cursor ? 1 : 0,
    cursor: cursorOption,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, displayId: true, firstName: true, lastName: true },
      },
      soldBy: {
        select: { id: true, username: true },
      },
      paymentDetails: true,
    },
  });

  const hasMore = sales.length > take;
  const data = hasMore ? sales.slice(0, -1) : sales;
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
}));

// GET /api/sales/customer/:customerId - Get all sales for a customer
router.get('/customer/:customerId', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { customerId } = req.params;

  // Find customer by ID or displayId
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { id: customerId },
        { displayId: customerId },
      ],
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  const sales = await prisma.sale.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    include: {
      soldBy: {
        select: { id: true, username: true },
      },
      paymentDetails: true,
    },
  });

  // Get media folder payment status
  const mediaFolder = await prisma.mediaFolder.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate totals
  const totalSpent = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalPaid = sales.filter(s => s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.totalPrice, 0);
  const totalUnpaid = sales.filter(s => s.paymentStatus === 'UNPAID').reduce((sum, s) => sum + s.totalPrice, 0);

  res.json({
    success: true,
    data: {
      customer: {
        id: customer.id,
        displayId: customer.displayId,
        name: `${customer.firstName} ${customer.lastName}`,
      },
      sales,
      mediaFolder: mediaFolder ? {
        id: mediaFolder.id,
        paymentStatus: mediaFolder.paymentStatus,
        fileCount: mediaFolder.fileCount,
      } : null,
      summary: {
        totalSpent,
        totalPaid,
        totalUnpaid,
        itemCount: sales.length,
      },
    },
  });
}));

// GET /api/sales/unpaid - List all unpaid sales grouped by customer
router.get('/unpaid', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { date } = req.query;

  const where: any = { paymentStatus: 'UNPAID' };

  // Date filter
  if (date) {
    const filterDate = new Date(date as string);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, displayId: true, firstName: true, lastName: true },
      },
      soldBy: {
        select: { id: true, username: true, name: true },
      },
      paymentDetails: true,
    },
  });

  // Group by customer
  const grouped: Record<string, { customer: any; sales: any[]; total: number; totalEUR: number; totalTRY: number }> = {};

  for (const sale of sales) {
    const customerId = sale.customerId || 'anonymous';
    if (!grouped[customerId]) {
      grouped[customerId] = {
        customer: sale.customer || { id: null, displayId: 'Anonim', firstName: 'Müşterisiz', lastName: 'Satış' },
        sales: [],
        total: 0,
        totalEUR: 0,
        totalTRY: 0,
      };
    }
    grouped[customerId].sales.push(sale);
    grouped[customerId].total += sale.totalPrice;
    grouped[customerId].totalEUR += sale.totalAmountEUR || sale.totalPrice;
    grouped[customerId].totalTRY += sale.totalAmountTRY || 0;
  }

  const customers = Object.values(grouped).sort((a, b) => b.total - a.total);

  res.json({
    success: true,
    data: {
      customers,
      totalUnpaid: sales.reduce((sum, s) => sum + s.totalPrice, 0),
      totalUnpaidEUR: sales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0),
      totalUnpaidTRY: sales.reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0),
      unpaidCount: sales.length,
    },
  });
}));

// GET /api/sales/daily-report - Daily sales report
router.get('/daily-report', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { date } = req.query;

  const filterDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(filterDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(filterDate);
  endOfDay.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      customer: {
        select: { id: true, displayId: true, firstName: true, lastName: true },
      },
      soldBy: {
        select: { id: true, username: true },
      },
      paymentDetails: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get media folder payments for today
  const mediaFolders = await prisma.mediaFolder.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      paymentStatus: 'PAID',
    },
  });

  // Calculate totals
  const totalSales = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalSalesEUR = sales.reduce((sum, s) => sum + (s.totalAmountEUR || s.totalPrice), 0);
  const totalSalesTRY = sales.reduce((sum, s) => sum + (s.totalAmountTRY || 0), 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'CASH' && s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.totalPrice, 0);
  const cardSales = sales.filter(s => s.paymentMethod === 'CREDIT_CARD' && s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.totalPrice, 0);
  const transferSales = sales.filter(s => s.paymentMethod === 'TRANSFER' && s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.totalPrice, 0);
  const unpaidSales = sales.filter(s => s.paymentStatus === 'UNPAID').reduce((sum, s) => sum + s.totalPrice, 0);
  const mediaSales = mediaFolders.reduce((sum, m) => sum + (m.paymentAmount || 0), 0);

  // Currency breakdown from payment details
  const allPaymentDetails = sales.flatMap(s => s.paymentDetails || []);
  const currencyBreakdown: Record<string, { count: number; total: number; totalEUR: number; totalTRY: number }> = {};
  for (const detail of allPaymentDetails) {
    if (!currencyBreakdown[detail.currency]) {
      currencyBreakdown[detail.currency] = { count: 0, total: 0, totalEUR: 0, totalTRY: 0 };
    }
    currencyBreakdown[detail.currency].count += 1;
    currencyBreakdown[detail.currency].total += detail.amount;
    currencyBreakdown[detail.currency].totalEUR += detail.amountInEUR;
    currencyBreakdown[detail.currency].totalTRY += detail.amountInTRY;
  }

  // Category breakdown
  const categories: Record<string, { count: number; total: number }> = {};
  for (const sale of sales) {
    if (!categories[sale.itemType]) {
      categories[sale.itemType] = { count: 0, total: 0 };
    }
    categories[sale.itemType].count += sale.quantity;
    categories[sale.itemType].total += sale.totalPrice;
  }

  // Payment method breakdown
  const paymentMethods = {
    CASH: cashSales,
    CREDIT_CARD: cardSales,
    TRANSFER: transferSales,
    UNPAID: unpaidSales,
  };

  // Hourly distribution
  const hourly: Record<number, number> = {};
  for (let i = 6; i <= 22; i++) hourly[i] = 0;
  for (const sale of sales) {
    const hour = sale.createdAt.getHours();
    if (hourly[hour] !== undefined) {
      hourly[hour] += sale.totalPrice;
    }
  }

  res.json({
    success: true,
    data: {
      date: filterDate.toISOString().split('T')[0],
      summary: {
        totalSales,
        totalSalesEUR,
        totalSalesTRY,
        cashSales,
        cardSales,
        transferSales,
        unpaidSales,
        mediaSales,
        paidTotal: cashSales + cardSales + transferSales,
        transactionCount: sales.length,
      },
      categories,
      paymentMethods,
      currencyBreakdown,
      hourly: Object.entries(hourly).map(([hour, amount]) => ({
        hour: parseInt(hour),
        amount,
      })),
      sales,
    },
  });
}));

// PATCH /api/sales/:id/payment - Update payment status
router.patch('/:id/payment', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod, currency: payCurrency } = req.body;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Satış bulunamadı', 404, 'SALE_NOT_FOUND');
  }

  const cur: Currency = payCurrency || 'EUR';
  const method = paymentMethod || 'CASH';

  // Calculate EUR/TRY amounts if not already set
  const totalAmountEUR = existing.totalAmountEUR || convertAmount(existing.totalPrice, cur, 'EUR').converted;
  const totalAmountTRY = existing.totalAmountTRY || convertAmount(existing.totalPrice, cur, 'TRY').converted;

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      paymentStatus: paymentStatus || 'PAID',
      paymentMethod: method,
      primaryCurrency: cur,
      totalAmountEUR,
      totalAmountTRY,
    },
    include: {
      customer: {
        select: { id: true, displayId: true, firstName: true, lastName: true },
      },
      paymentDetails: true,
    },
  });

  // Create payment detail record
  if ((paymentStatus || 'PAID') === 'PAID') {
    const rateInfo = getRate(cur, 'EUR');
    await prisma.paymentDetail.create({
      data: {
        saleId: id,
        currency: cur,
        amount: existing.totalPrice,
        amountInEUR: totalAmountEUR,
        amountInTRY: totalAmountTRY,
        exchangeRate: rateInfo.rate,
        exchangeSource: rateInfo.source,
        paymentMethod: method,
      },
    });
  }

  res.json({
    success: true,
    data: sale,
    message: 'Ödeme durumu güncellendi',
  });
}));

// POST /api/sales/bulk-pay/:customerId - Pay all unpaid sales for a customer
router.post('/bulk-pay/:customerId', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { customerId } = req.params;
  const { paymentMethod, currency: payCurrency } = req.body;

  const cur: Currency = payCurrency || 'EUR';

  // Find customer
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { id: customerId },
        { displayId: customerId },
      ],
    },
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Get unpaid sales
  const unpaidSales = await prisma.sale.findMany({
    where: { customerId: customer.id, paymentStatus: 'UNPAID' },
  });

  const method = paymentMethod || 'CASH';

  // Update all unpaid sales and create payment details
  await prisma.$transaction(async (tx) => {
    for (const sale of unpaidSales) {
      const totalAmountEUR = sale.totalAmountEUR || convertAmount(sale.totalPrice, 'EUR', 'EUR').converted;
      const totalAmountTRY = sale.totalAmountTRY || convertAmount(sale.totalPrice, 'EUR', 'TRY').converted;

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: method,
          primaryCurrency: cur,
          totalAmountEUR,
          totalAmountTRY,
        },
      });

      const rateInfo = getRate(cur, 'EUR');
      await tx.paymentDetail.create({
        data: {
          saleId: sale.id,
          currency: cur,
          amount: sale.totalPrice,
          amountInEUR: totalAmountEUR,
          amountInTRY: totalAmountTRY,
          exchangeRate: rateInfo.rate,
          exchangeSource: rateInfo.source,
          paymentMethod: method,
        },
      });
    }
  });

  res.json({
    success: true,
    data: { paidCount: unpaidSales.length },
    message: `${unpaidSales.length} satış ödendi olarak işaretlendi`,
  });
}));

// DELETE /api/sales/:id - Delete/cancel sale (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Satış bulunamadı', 404, 'SALE_NOT_FOUND');
  }

  await prisma.sale.delete({ where: { id } });

  res.json({
    success: true,
    message: 'Satış iptal edildi',
  });
}));

export default router;

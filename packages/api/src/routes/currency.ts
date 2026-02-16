import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import {
  getAllRates,
  convertAmount,
  setManualRate,
  getRate,
} from '../services/currencyService.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/currency/rates — Public: get current rates
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const rates = getAllRates();

    // Also return EUR/TRY directly for convenience
    const eurTryRate = getRate('EUR', 'TRY');

    res.json({
      success: true,
      data: {
        base: 'EUR',
        rates,
        eurTry: eurTryRate.rate,
        lastUpdate: eurTryRate.fetchedAt,
        source: eurTryRate.source,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/currency/convert — Convert amount
router.post('/convert', async (req: Request, res: Response) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'amount, from, to parametreleri gerekli',
      });
    }

    const result = convertAmount(parseFloat(amount), from, to);

    res.json({
      success: true,
      data: {
        amount: parseFloat(amount),
        from,
        to,
        converted: result.converted,
        rate: result.rate,
        source: result.source,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/currency/rates/:currency — Admin: manual rate update
router.put('/rates/:currency', authenticate, async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    const { buyRate, sellRate } = req.body;
    const user = (req as any).user;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    const validCurrencies = ['USD', 'GBP', 'RUB', 'TRY'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Geçersiz para birimi. Geçerli: ${validCurrencies.join(', ')}`,
      });
    }

    if (!buyRate || !sellRate) {
      return res.status(400).json({
        success: false,
        message: 'buyRate ve sellRate parametreleri gerekli',
      });
    }

    await setManualRate(currency as any, parseFloat(buyRate), parseFloat(sellRate));

    res.json({
      success: true,
      message: `${currency} kuru güncellendi`,
      data: { currency, buyRate: parseFloat(buyRate), sellRate: parseFloat(sellRate) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/currency/history — Admin: rate history
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    const { currency, days } = req.query;
    const daysNum = parseInt(days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    const where: any = { fetchedAt: { gte: since } };
    if (currency) {
      where.currency = currency as string;
    }

    const history = await prisma.exchangeRateHistory.findMany({
      where,
      orderBy: { fetchedAt: 'desc' },
      take: 500,
    });

    res.json({
      success: true,
      data: { history, count: history.length },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

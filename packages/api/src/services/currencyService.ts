import { PrismaClient } from '@prisma/client';
import xml2js from 'xml2js';

const prisma = new PrismaClient();

type Currency = 'EUR' | 'USD' | 'GBP' | 'RUB' | 'TRY';

interface RateInfo {
  buyRate: number;
  sellRate: number;
  source: string;
  fetchedAt: Date;
}

interface ConvertResult {
  converted: number;
  rate: number;
  source: string;
}

// In-memory cache
let ratesCache: Record<string, RateInfo> = {};
let lastFetchTime: Date | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Fallback rates from env or defaults
function getFallbackRates(): Record<string, { buy: number; sell: number }> {
  return {
    EUR_TRY: {
      buy: parseFloat(process.env.FALLBACK_EUR_TRY || '38.50'),
      sell: parseFloat(process.env.FALLBACK_EUR_TRY || '38.50') * 1.02,
    },
    USD_TRY: {
      buy: parseFloat(process.env.FALLBACK_USD_TRY || '35.20'),
      sell: parseFloat(process.env.FALLBACK_USD_TRY || '35.20') * 1.02,
    },
    GBP_TRY: {
      buy: parseFloat(process.env.FALLBACK_GBP_TRY || '44.50'),
      sell: parseFloat(process.env.FALLBACK_GBP_TRY || '44.50') * 1.02,
    },
    RUB_TRY: {
      buy: parseFloat(process.env.FALLBACK_RUB_TRY || '0.36'),
      sell: parseFloat(process.env.FALLBACK_RUB_TRY || '0.36') * 1.02,
    },
  };
}

// Fetch from TCMB XML API
async function fetchFromTCMB(): Promise<Record<string, { buy: number; sell: number }> | null> {
  try {
    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    const xmlText = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlText);

    const currencies = result?.Tarih_Date?.Currency;
    if (!currencies || !Array.isArray(currencies)) return null;

    const rates: Record<string, { buy: number; sell: number }> = {};
    const targetCodes = ['USD', 'EUR', 'GBP', 'RUB'];

    for (const curr of currencies) {
      const code = curr?.$?.CurrencyCode;
      if (!targetCodes.includes(code)) continue;

      const forexBuying = parseFloat(curr.ForexBuying);
      const forexSelling = parseFloat(curr.ForexSelling);

      if (isNaN(forexBuying) || isNaN(forexSelling) || forexBuying === 0) continue;

      rates[`${code}_TRY`] = { buy: forexBuying, sell: forexSelling };
    }

    // We need at least EUR and one other
    if (!rates['EUR_TRY']) return null;

    return rates;
  } catch (error) {
    console.error('[CurrencyService] TCMB fetch error:', error);
    return null;
  }
}

// Fetch from Frankfurter API (EUR-based)
async function fetchFromFrankfurter(): Promise<Record<string, { buy: number; sell: number }> | null> {
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,TRY', {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    const data = await response.json() as { rates?: Record<string, number> };
    if (!data.rates) return null;

    const eurTry = data.rates.TRY;
    const eurUsd = data.rates.USD;
    const eurGbp = data.rates.GBP;

    if (!eurTry || !eurUsd || !eurGbp) return null;

    // Convert to TRY-based rates (what TCMB gives)
    const rates: Record<string, { buy: number; sell: number }> = {
      EUR_TRY: { buy: eurTry, sell: eurTry * 1.01 },
      USD_TRY: { buy: eurTry / eurUsd, sell: (eurTry / eurUsd) * 1.01 },
      GBP_TRY: { buy: eurTry / eurGbp, sell: (eurTry / eurGbp) * 1.01 },
    };

    // Frankfurter doesn't have RUB, use fallback
    const fallback = getFallbackRates();
    rates['RUB_TRY'] = fallback['RUB_TRY'];

    return rates;
  } catch (error) {
    console.error('[CurrencyService] Frankfurter fetch error:', error);
    return null;
  }
}

// Convert TRY-based rates to EUR-based rates
// +1 TRY markup: sistem kuru her zaman API kurunun 1₺ fazlası
function convertToEURBase(tryRates: Record<string, { buy: number; sell: number }>): Record<Currency, RateInfo> {
  const MARKUP_TRY = 1; // Her döviz kurunun TRY değerine +1₺ eklenir

  const eurTry = tryRates['EUR_TRY'];
  if (!eurTry) throw new Error('EUR_TRY rate missing');

  // Apply +1 TRY markup to all rates
  const markedUp: Record<string, { buy: number; sell: number }> = {};
  for (const [key, val] of Object.entries(tryRates)) {
    markedUp[key] = { buy: val.buy + MARKUP_TRY, sell: val.sell + MARKUP_TRY };
  }

  const eurTryMarked = markedUp['EUR_TRY'];
  const now = new Date();
  const rates: Partial<Record<Currency, RateInfo>> = {};

  // EUR itself (base)
  rates.EUR = {
    buyRate: 1,
    sellRate: 1,
    source: 'BASE',
    fetchedAt: now,
  };

  // TRY per EUR (with markup)
  rates.TRY = {
    buyRate: eurTryMarked.buy,
    sellRate: eurTryMarked.sell,
    source: ratesCache.TRY?.source || 'TCMB',
    fetchedAt: now,
  };

  // 1 EUR = X USD → EUR_TRY / USD_TRY (both with +1₺ markup)
  if (markedUp['USD_TRY']) {
    rates.USD = {
      buyRate: eurTryMarked.buy / markedUp['USD_TRY'].buy,
      sellRate: eurTryMarked.sell / markedUp['USD_TRY'].sell,
      source: ratesCache.USD?.source || 'TCMB',
      fetchedAt: now,
    };
  }

  // 1 EUR = X GBP → EUR_TRY / GBP_TRY (both with +1₺ markup)
  if (markedUp['GBP_TRY']) {
    rates.GBP = {
      buyRate: eurTryMarked.buy / markedUp['GBP_TRY'].buy,
      sellRate: eurTryMarked.sell / markedUp['GBP_TRY'].sell,
      source: ratesCache.GBP?.source || 'TCMB',
      fetchedAt: now,
    };
  }

  // 1 EUR = X RUB → EUR_TRY / RUB_TRY (both with +1₺ markup)
  if (markedUp['RUB_TRY']) {
    rates.RUB = {
      buyRate: eurTryMarked.buy / markedUp['RUB_TRY'].buy,
      sellRate: eurTryMarked.sell / markedUp['RUB_TRY'].sell,
      source: ratesCache.RUB?.source || 'TCMB',
      fetchedAt: now,
    };
  }

  return rates as Record<Currency, RateInfo>;
}

// Main fetch and update function
export async function fetchAndUpdateRates(): Promise<void> {
  let source = 'TCMB';
  let tryRates = await fetchFromTCMB();

  if (!tryRates) {
    console.log('[CurrencyService] TCMB failed, trying Frankfurter...');
    source = 'FRANKFURTER';
    tryRates = await fetchFromFrankfurter();
  }

  if (!tryRates) {
    console.log('[CurrencyService] Frankfurter failed, using fallback rates...');
    source = 'FALLBACK';
    tryRates = getFallbackRates();
  }

  const eurRates = convertToEURBase(tryRates);
  const now = new Date();

  // Update source on all rates
  for (const key of Object.keys(eurRates) as Currency[]) {
    eurRates[key].source = source;
    eurRates[key].fetchedAt = now;
  }

  // Update in-memory cache
  ratesCache = {};
  for (const [currency, info] of Object.entries(eurRates)) {
    ratesCache[currency] = info;
  }
  lastFetchTime = now;

  // Save to DB
  const currencies: Currency[] = ['USD', 'GBP', 'RUB', 'TRY'];
  for (const currency of currencies) {
    const rate = eurRates[currency];
    if (!rate) continue;

    // Upsert current rate
    await prisma.exchangeRate.upsert({
      where: { baseCurrency_currency: { baseCurrency: 'EUR', currency } },
      update: {
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        source,
        fetchedAt: now,
      },
      create: {
        baseCurrency: 'EUR',
        currency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        source,
        fetchedAt: now,
      },
    });

    // Add to history
    await prisma.exchangeRateHistory.create({
      data: {
        baseCurrency: 'EUR',
        currency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        source,
        fetchedAt: now,
      },
    });
  }

  console.log(`[CurrencyService] Rates updated from ${source} at ${now.toLocaleTimeString('tr-TR')}`);
  console.log(`  1 EUR = ${eurRates.TRY?.buyRate.toFixed(2)} TRY | ${eurRates.USD?.buyRate.toFixed(4)} USD | ${eurRates.GBP?.buyRate.toFixed(4)} GBP | ${eurRates.RUB?.buyRate.toFixed(2)} RUB`);
}

// Get rate for a currency pair
export function getRate(from: Currency, to: Currency): { rate: number; source: string; fetchedAt: Date } {
  if (from === to) return { rate: 1, source: 'IDENTITY', fetchedAt: new Date() };

  // If cache is empty, load from fallback
  if (Object.keys(ratesCache).length === 0) {
    const tryRates = getFallbackRates();
    const eurRates = convertToEURBase(tryRates);
    for (const [currency, info] of Object.entries(eurRates)) {
      ratesCache[currency] = { ...info, source: 'FALLBACK' };
    }
    lastFetchTime = new Date();
  }

  // Everything is EUR-based in cache
  // from->EUR rate = 1/cache[from].buyRate (or 1 if from=EUR)
  // EUR->to rate = cache[to].buyRate (or 1 if to=EUR)

  const fromRate = from === 'EUR' ? 1 : ratesCache[from]?.buyRate;
  const toRate = to === 'EUR' ? 1 : ratesCache[to]?.buyRate;

  if (!fromRate || !toRate) {
    // Final fallback
    return { rate: 1, source: 'UNKNOWN', fetchedAt: new Date() };
  }

  // from X -> EUR: divide by fromRate (which is X per EUR)
  // EUR -> to Y: multiply by toRate (which is Y per EUR)
  const rate = toRate / fromRate;
  const info = ratesCache[to] || ratesCache[from];

  return {
    rate,
    source: info?.source || 'FALLBACK',
    fetchedAt: info?.fetchedAt || new Date(),
  };
}

// Convert amount between currencies
export function convertAmount(amount: number, from: Currency, to: Currency): ConvertResult {
  const { rate, source } = getRate(from, to);
  return {
    converted: Math.round(amount * rate * 100) / 100,
    rate,
    source,
  };
}

// Get all rates (EUR-based)
export function getAllRates(): Record<string, { buyRate: number; sellRate: number; source: string; fetchedAt: Date }> {
  // If cache is empty, load from fallback
  if (Object.keys(ratesCache).length === 0) {
    const tryRates = getFallbackRates();
    const eurRates = convertToEURBase(tryRates);
    for (const [currency, info] of Object.entries(eurRates)) {
      ratesCache[currency] = { ...info, source: 'FALLBACK' };
    }
    lastFetchTime = new Date();
  }

  const result: Record<string, { buyRate: number; sellRate: number; source: string; fetchedAt: Date }> = {};
  for (const [currency, info] of Object.entries(ratesCache)) {
    result[currency] = {
      buyRate: info.buyRate,
      sellRate: info.sellRate,
      source: info.source,
      fetchedAt: info.fetchedAt,
    };
  }
  return result;
}

// Set manual rate for a currency
export async function setManualRate(currency: Currency, buyRate: number, sellRate: number): Promise<void> {
  const now = new Date();

  ratesCache[currency] = {
    buyRate,
    sellRate,
    source: 'MANUAL',
    fetchedAt: now,
  };

  await prisma.exchangeRate.upsert({
    where: { baseCurrency_currency: { baseCurrency: 'EUR', currency } },
    update: { buyRate, sellRate, source: 'MANUAL', fetchedAt: now },
    create: { baseCurrency: 'EUR', currency, buyRate, sellRate, source: 'MANUAL', fetchedAt: now },
  });

  await prisma.exchangeRateHistory.create({
    data: { baseCurrency: 'EUR', currency, buyRate, sellRate, source: 'MANUAL', fetchedAt: now },
  });
}

// Load rates from DB on startup (before first fetch succeeds)
export async function loadRatesFromDB(): Promise<void> {
  try {
    const dbRates = await prisma.exchangeRate.findMany({
      where: { baseCurrency: 'EUR' },
    });

    if (dbRates.length > 0) {
      for (const rate of dbRates) {
        ratesCache[rate.currency] = {
          buyRate: rate.buyRate,
          sellRate: rate.sellRate,
          source: rate.source,
          fetchedAt: rate.fetchedAt,
        };
      }
      // Always include EUR as base
      ratesCache['EUR'] = { buyRate: 1, sellRate: 1, source: 'BASE', fetchedAt: new Date() };
      lastFetchTime = new Date();
      console.log(`[CurrencyService] Loaded ${dbRates.length} rates from DB`);
    }
  } catch (error) {
    console.error('[CurrencyService] Failed to load rates from DB:', error);
  }
}

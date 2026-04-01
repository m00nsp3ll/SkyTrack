import dotenv from 'dotenv';
// Load .env FIRST before any other imports that might need env vars
dotenv.config({ path: '../../.env' });

// Set timezone to Turkey — all new Date() calls will use TR time
process.env.TZ = 'Europe/Istanbul';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

import authRoutes from './routes/auth.js';
import pilotsRoutes from './routes/pilots.js';
import customersRoutes from './routes/customers.js';
import flightsRoutes from './routes/flights.js';
import mediaRoutes from './routes/media.js';
import productsRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/users.js';
import pushRoutes from './routes/push.js';
import fcmRoutes from './routes/fcm.js';
import currencyRoutes from './routes/currency.js';
import networkRoutes from './routes/network.js';
import nasRoutes from './routes/nas.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocket } from './socket/index.js';
import { setupCronJobs } from './cron/dailyReset.js';
import { startCronJobs } from './services/cronJobs.js';
import { cache } from './services/cache.js';
import { getLocalIP } from './utils/networkUtils.js';

const app = express();

// SSL certificates for HTTPS
const certsPath = path.join(process.cwd(), '..', '..', 'certs');
let httpsServer;
let httpServer;

try {
  const sslOptions = {
    key: fs.readFileSync(path.join(certsPath, 'localhost.key')),
    cert: fs.readFileSync(path.join(certsPath, 'localhost.crt')),
  };
  httpsServer = createHttpsServer(sslOptions, app);
  console.log('🔒 HTTPS enabled');
} catch (err) {
  console.log('⚠️ SSL certificates not found, falling back to HTTP');
  httpServer = createServer(app);
}

const server = httpsServer || httpServer;

const SERVER_PORT = process.env.SERVER_PORT || 3001;
const WEB_PORT = process.env.WEB_PORT || 3000;
const LAN_HTTPS_PORT = parseInt(process.env.LAN_HTTPS_PORT || '3080');

// Get current IP dynamically
const getCurrentIP = () => getLocalIP();

// Socket.IO setup - allow all origins for LAN access
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins on local network
      callback(null, true);
    },
    credentials: true,
  },
});

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - allow all origins for LAN access
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    // and all local network origins
    callback(null, true);
  },
  credentials: true,
}));

// Compression (gzip) for better performance
app.use(compression());

// Rate limiting (100 requests per minute per IP)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for media
app.use('/media', express.static('media'));

// Health check with dynamic IP info
app.get('/api/health', (req, res) => {
  const currentIP = getCurrentIP();
  res.json({
    success: true,
    message: 'SkyTrack API is running',
    timestamp: new Date().toISOString(),
    cache: cache.isAvailable() ? 'connected' : 'disabled',
    network: {
      ip: currentIP,
      apiUrl: `http://${currentIP}:${SERVER_PORT}`,
      webUrl: `http://${currentIP}:${WEB_PORT}`,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pilots', pilotsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/nas', nasRoutes);

// Error handler
app.use(errorHandler);

// Setup Socket.IO
setupSocket(io);

// Setup Cron Jobs
setupCronJobs();
startCronJobs();

// Start server on all interfaces (0.0.0.0) for LAN access
const protocol = httpsServer ? 'https' : 'http';
(server as any).listen(SERVER_PORT, '0.0.0.0', () => {
  const currentIP = getCurrentIP();
  console.log(`🚀 SkyTrack API running at ${protocol}://${currentIP}:${SERVER_PORT}`);
  console.log(`🌐 Web App: https://${currentIP}:${WEB_PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🗜️ Compression enabled`);
  console.log(`🛡️ Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/min`);
});

// ═══════════════════════════════════════════════════════════════════
// LAN HTTPS Download Server (port 3080)
// Self-signed HTTPS — HTTPS→HTTPS yönlendirme Chrome'da çalışır.
// ═══════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';

const lanPrisma = new PrismaClient();
const lanApp = express();
lanApp.use(cors({ origin: true }));
lanApp.use(compression());

// 1x1 transparent PNG pixel — LAN reachability check (Image trick)
const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElEQkSuQmCC', 'base64');

lanApp.get('/api/network/lan-check', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Content-Type', 'image/png');
  res.set('Content-Length', String(PIXEL_PNG.length));
  res.send(PIXEL_PNG);
});

// GET /api/media/:customerId/download — ZIP download (LAN)
lanApp.get('/api/media/:customerId/download', async (req, res) => {
  const { customerId } = req.params;

  try {
    const customer = await lanPrisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: { flights: { orderBy: { createdAt: 'desc' }, take: 1, include: { mediaFolder: true } } },
    });

    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });
    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) return res.status(404).json({ error: 'Medya bulunamadı' });
    if (mediaFolder.paymentStatus !== 'PAID') return res.status(403).json({ error: 'Ödeme yapılmadı' });

    const zipFilename = `${customer.displayId}_SkyTrack.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const archive = archiver('zip', { zlib: { level: 1 } });
    archive.on('error', () => { if (!res.headersSent) res.status(500).end(); });
    archive.pipe(res);
    archive.directory(mediaFolder.folderPath, 'Alanya_Paragliding');
    await archive.finalize();

    await lanPrisma.mediaFolder.update({
      where: { id: mediaFolder.id },
      data: { deliveryStatus: 'DELIVERED' },
    }).catch(() => {});
  } catch (err) {
    console.error('LAN download error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'İndirme hatası' });
  }
});

// GET /api/media/:customerId/file/:filename — Single file download (LAN, Range support)
lanApp.get('/api/media/:customerId/file/:filename', async (req, res) => {
  const { customerId, filename } = req.params;

  try {
    const customer = await lanPrisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { displayId: customerId }] },
      include: { flights: { orderBy: { createdAt: 'desc' }, take: 1, include: { mediaFolder: true } } },
    });

    if (!customer) return res.status(404).send('Not found');
    const mediaFolder = customer.flights[0]?.mediaFolder;
    if (!mediaFolder) return res.status(404).send('Not found');
    if (mediaFolder.paymentStatus !== 'PAID') return res.status(403).send('Payment required');

    const safeFilename = path.basename(filename);
    const filePath = path.join(mediaFolder.folderPath, safeFilename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mime,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('LAN file download error:', err);
    if (!res.headersSent) res.status(500).send('Error');
  }
});

let lanServer;
try {
  const lanSslOptions = {
    key: fs.readFileSync(path.join(certsPath, 'localhost.key')),
    cert: fs.readFileSync(path.join(certsPath, 'localhost.crt')),
  };
  lanServer = createHttpsServer(lanSslOptions, lanApp);
} catch {
  lanServer = createServer(lanApp);
  console.log('⚠️ LAN Download: SSL bulunamadı, HTTP fallback');
}
lanServer.listen(LAN_HTTPS_PORT, '0.0.0.0', () => {
  const currentIP = getCurrentIP();
  console.log(`📡 LAN Download: https://${currentIP}:${LAN_HTTPS_PORT}`);
});

export { app, io };

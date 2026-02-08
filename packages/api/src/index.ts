import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import pilotsRoutes from './routes/pilots.js';
import customersRoutes from './routes/customers.js';
import flightsRoutes from './routes/flights.js';
import mediaRoutes from './routes/media.js';
import productsRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocket } from './socket/index.js';
import { setupCronJobs } from './cron/dailyReset.js';
import { cache } from './services/cache.js';
import { getLocalIP } from './utils/networkUtils.js';

dotenv.config({ path: '../../.env' });

const app = express();
const httpServer = createServer(app);

const SERVER_PORT = process.env.SERVER_PORT || 3001;
const WEB_PORT = process.env.WEB_PORT || 3000;

// Get current IP dynamically
const getCurrentIP = () => getLocalIP();

// Socket.IO setup - allow all origins for LAN access
const io = new Server(httpServer, {
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

// Error handler
app.use(errorHandler);

// Setup Socket.IO
setupSocket(io);

// Setup Cron Jobs
setupCronJobs();

// Start server on all interfaces (0.0.0.0) for LAN access
httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
  const currentIP = getCurrentIP();
  console.log(`🚀 SkyTrack API running at http://${currentIP}:${SERVER_PORT}`);
  console.log(`🌐 Web App: http://${currentIP}:${WEB_PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🗜️ Compression enabled`);
  console.log(`🛡️ Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/min`);
});

export { app, io };

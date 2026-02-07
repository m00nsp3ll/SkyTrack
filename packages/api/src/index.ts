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
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocket } from './socket/index.js';
import { setupCronJobs } from './cron/dailyReset.js';
import { cache } from './services/cache.js';

dotenv.config({ path: '../../.env' });

const app = express();
const httpServer = createServer(app);

const SERVER_PORT = process.env.SERVER_PORT || 3001;
const SERVER_IP = process.env.SERVER_IP || 'localhost';

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: [`http://${SERVER_IP}:3000`, 'http://localhost:3000'],
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

// CORS
app.use(cors({
  origin: [`http://${SERVER_IP}:3000`, 'http://localhost:3000'],
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SkyTrack API is running',
    timestamp: new Date().toISOString(),
    cache: cache.isAvailable() ? 'connected' : 'disabled',
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

// Error handler
app.use(errorHandler);

// Setup Socket.IO
setupSocket(io);

// Setup Cron Jobs
setupCronJobs();

// Start server
httpServer.listen(SERVER_PORT, () => {
  console.log(`🚀 SkyTrack API running at http://${SERVER_IP}:${SERVER_PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🗜️ Compression enabled`);
  console.log(`🛡️ Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/min`);
});

export { app, io };

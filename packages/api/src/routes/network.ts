import { Router } from 'express';
import { getLocalIP, getClientIP } from '../utils/networkUtils.js';

const router = Router();

// NAS LAN IP — müşteri buna ping atarak aynı ağda olup olmadığını anlar
const NAS_LAN_IP = process.env.QNAP_SSH_HOST_LOCAL || '192.168.1.105';
const NAS_LAN_PORT = 3001; // API port (ping için kullanılmaz, sadece bilgi)

// GET /api/network/discover - LAN detection
// Sunucu NAS'ın LAN IP'sini döner, frontend o IP'ye ping atar
router.get('/discover', async (req, res) => {
  const localIP = getLocalIP();
  const clientIP = getClientIP(req);

  const isPrivate = (ip: string) =>
    /^10\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    ip === '127.0.0.1' ||
    ip === '::1';

  const isLan = isPrivate(clientIP);

  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Access-Control-Allow-Origin', '*');
  res.json({
    localIP,
    clientIP,
    isLan,
    // NAS'ın LAN IP'si — müşteri buna ping atarak aynı ağda mı diye anlar
    nasLanIp: NAS_LAN_IP,
    nasLanApiUrl: `http://${NAS_LAN_IP}:3001`,
    lanIp: NAS_LAN_IP,
    lanApiUrl: `http://${NAS_LAN_IP}:3001`,
  });
});

// GET /api/network/ping - Simple ping for LAN probe (no auth, fast)
router.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Access-Control-Allow-Origin', '*');
  res.json({ ok: true });
});

export default router;

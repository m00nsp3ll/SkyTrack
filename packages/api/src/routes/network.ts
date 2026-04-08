import { Router } from 'express';
import { getLocalIP, getClientIP } from '../utils/networkUtils.js';

const router = Router();

// GET /api/network/discover - LAN detection
// Returns server's local IP so frontend can probe it directly
router.get('/discover', async (req, res) => {
  const localIP = getLocalIP();
  const clientIP = getClientIP(req);

  // Private IP ranges: 10.x, 172.16-31.x, 192.168.x
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
    lanBaseUrl: isLan ? `http://${localIP}:3001` : null,
    // Always expose localIP so frontend can probe directly
    lanIp: localIP,
    lanApiUrl: `http://${localIP}:3001`,
    isLan,
  });
});

// GET /api/network/ping - Simple ping for LAN probe (no auth, fast)
router.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Access-Control-Allow-Origin', '*');
  res.json({ ok: true });
});

export default router;

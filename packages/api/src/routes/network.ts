import { Router } from 'express';
import { getLocalIP, getPublicIP, getClientIP } from '../utils/networkUtils.js';

const router = Router();
const LAN_HTTPS_PORT = process.env.LAN_HTTPS_PORT || 3080;

// GET /api/network/discover - Server-side LAN detection
router.get('/discover', async (req, res) => {
  const localIP = getLocalIP();
  const clientIP = getClientIP(req);
  const serverPublicIP = await getPublicIP();

  const isLan = !!(serverPublicIP && clientIP && clientIP === serverPublicIP);

  res.set('Cache-Control', 'no-store, max-age=0');
  res.json({
    localIP,
    lanBaseUrl: localIP ? `https://${localIP}:${LAN_HTTPS_PORT}` : null,
    isLan,
  });
});

export default router;

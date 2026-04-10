import { Router } from 'express';
import { getLocalIP, getClientIP } from '../utils/networkUtils.js';

const router = Router();

const NAS_LAN_IP = process.env.QNAP_SSH_HOST_LOCAL || '192.168.1.105';
// Ofisin sabit public IP'si — bu IP'den gelen istek = ofis WiFi'ındayız
const OFFICE_PUBLIC_IP = process.env.OFFICE_PUBLIC_IP || '81.213.175.47';
// NAS public HTTPS — Let's Encrypt cert + Virtual Host port 8443
// Modem hairpin NAT sayesinde hem LAN hem WAN'dan aynı URL ile erişilebilir
const NAS_HTTPS_BASE = process.env.NAS_PUBLIC_URL || 'https://skytrack.myqnapcloud.com:8443';

// GET /api/network/discover - LAN detection
// Client'ın public IP'si ofis IP'siyle eşleşiyorsa = aynı ağdayız
router.get('/discover', async (req, res) => {
  const localIP = getLocalIP();
  const clientIP = getClientIP(req);

  // Ofis sabit IP kontrolü — en güvenilir yöntem
  const isLan = clientIP === OFFICE_PUBLIC_IP;

  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Access-Control-Allow-Origin', '*');
  res.json({
    localIP,
    clientIP,
    isLan,
    nasLanIp: NAS_LAN_IP,
    nasHttpsBase: NAS_HTTPS_BASE,
    officePublicIp: OFFICE_PUBLIC_IP,
  });
});

// GET /api/network/ping - Simple ping for LAN probe (no auth, fast)
router.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Access-Control-Allow-Origin', '*');
  res.json({ ok: true });
});

export default router;

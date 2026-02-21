import os from 'os';

/**
 * Get the current local IP address dynamically
 * Returns the first non-internal IPv4 address found
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (!netInterface) continue;

    for (const net of netInterface) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return 'localhost';
}

// Cache server public IP (refresh every hour)
let cachedPublicIP: string | null = null;
let publicIPTimestamp = 0;
const PUBLIC_IP_TTL = 3600000; // 1 hour

/**
 * Get server's public (WAN) IP address
 * Used to compare with client's IP for LAN detection
 */
export async function getPublicIP(): Promise<string | null> {
  if (cachedPublicIP && Date.now() - publicIPTimestamp < PUBLIC_IP_TTL) {
    return cachedPublicIP;
  }
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as { ip: string };
    cachedPublicIP = data.ip;
    publicIPTimestamp = Date.now();
    return cachedPublicIP;
  } catch {
    try {
      const res = await fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(5000) });
      cachedPublicIP = (await res.text()).trim();
      publicIPTimestamp = Date.now();
      return cachedPublicIP;
    } catch {
      return null;
    }
  }
}

/**
 * Extract client's real IP from request headers
 * Supports Cloudflare, nginx proxies, and direct connections
 */
export function getClientIP(req: any): string {
  return (req.headers['cf-connecting-ip'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
         req.socket?.remoteAddress?.replace('::ffff:', '') ||
         '';
}

/**
 * Get server URL with current IP
 */
export function getServerUrl(port: number = 3001): string {
  return `http://${getLocalIP()}:${port}`;
}

/**
 * Get web URL with current IP
 */
export function getWebUrl(port: number = 3000): string {
  return `http://${getLocalIP()}:${port}`;
}

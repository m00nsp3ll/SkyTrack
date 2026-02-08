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

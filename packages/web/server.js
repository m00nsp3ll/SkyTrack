const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.WEB_PORT || '3000', 10);

// Get local IP dynamically
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../../certs/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certs/localhost.crt')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    const localIP = getLocalIP();
    console.log(`🔒 HTTPS Server ready`);
    console.log(`   Local:   https://localhost:${port}`);
    console.log(`   Network: https://${localIP}:${port}`);
    console.log(`\n📱 Mobil cihazlarda QR tarayıcı çalışması için bu adresi kullanın.`);
  });
});

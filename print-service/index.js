#!/usr/bin/env node
/**
 * SkyTrack Print Service
 * Müşteri kaydı onaylandığında otomatik etiket basar.
 * Mac'te arka planda çalışır → Brother QL-810W
 */

const { io } = require('../node_modules/socket.io-client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = process.env.API_URL || 'https://api.skytrackyp.com/api';
const SOCKET_URL = process.env.SOCKET_URL || 'https://skytrackyp.com';
const PRINTER_NAME = process.env.PRINTER_NAME || 'Brother_QL_810W';
const TOKEN = process.env.TOKEN || '';
const tmpDir = path.join(__dirname, '.tmp');

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

console.log('🖨️  SkyTrack Print Service');
console.log(`   Yazıcı: ${PRINTER_NAME}`);
console.log(`   Sunucu: ${SOCKET_URL}\n`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Redirect takip et
        https.get(res.headers.location, { rejectUnauthorized: false }, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(true); });
        }).on('error', reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', reject);
  });
}

async function printLabel(customerId, displayId, customerName, pilotName) {
  try {
    const pdfPath = path.join(tmpDir, `${displayId}.pdf`);
    const url = `${API_URL}/customers/${customerId}/label?token=${TOKEN}`;

    console.log(`📋 ${displayId} - ${customerName} | Pilot: ${pilotName || '-'}`);

    await downloadFile(url, pdfPath);

    const stat = fs.statSync(pdfPath);
    if (stat.size < 500) {
      console.log('   ⚠️  PDF çok küçük, atlanıyor');
      return;
    }

    execSync(`lp -d "${PRINTER_NAME}" -o media=Custom.58x58mm -o fit-to-page "${pdfPath}"`, { stdio: 'pipe' });
    console.log('   ✅ Yazdırıldı');

    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 5000);
  } catch (err) {
    console.error('   ❌ Hata:', err.message);
  }
}

// Socket.IO bağlantısı
const socket = io(SOCKET_URL, { transports: ['websocket'], rejectUnauthorized: false });

socket.on('connect', () => {
  console.log('✅ Sunucuya bağlandı');
  socket.emit('join:room', 'admin');
});

socket.on('disconnect', () => {
  console.log('❌ Bağlantı kesildi...');
});

// Müşteri kaydı tamamlandığında
socket.on('customer:created', (data) => {
  if (!data?.customer) return;
  const { customer, pilot } = data;
  // Onay bekliyor — henüz yazdırma, confirm sonrası yazdırılacak
  console.log(`⏳ ${customer.displayId} - ${customer.firstName} ${customer.lastName} (onay bekliyor)`);
});

// Pilot onaylandığında — etiket bas
socket.on('print:label', (data) => {
  if (!data?.customerId) return;
  printLabel(data.customerId, data.displayId, data.customerName, data.pilotName);
});

// Fallback: customer:updated ile de tetiklenebilir
socket.on('customer:confirmed', (data) => {
  if (!data?.customerId) return;
  printLabel(data.customerId, data.displayId, data.customerName, data.pilotName);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Durduruluyor...');
  socket.disconnect();
  process.exit(0);
});

console.log('🔄 Dinleniyor... (Ctrl+C ile durdur)\n');

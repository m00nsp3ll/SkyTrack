#!/usr/bin/env node
/**
 * SkyTrack Print Service — Sadece bugünün kayıtlarını yazdırır
 */

const { io } = require('../node_modules/socket.io-client');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = process.env.API_URL || 'https://api.skytrackyp.com/api';
const SOCKET_URL = process.env.SOCKET_URL || 'https://api.skytrackyp.com';
const PRINTER_NAME = process.env.PRINTER_NAME || 'Brother_QL_810W';
const TOKEN = process.env.TOKEN || '';
const tmpDir = path.join(__dirname, '.tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const agent = new https.Agent({ keepAlive: true, maxSockets: 4, rejectUnauthorized: false });
https.get(`${API_URL.replace('/api', '')}/health`, { agent }, () => {}).on('error', () => {});

// Bugünün tarihini al (YYYY-MM-DD)
function today() { return new Date().toISOString().split('T')[0]; }

// Zaten yazdırılan ID'leri takip et — aynı etiketi iki kez basma
const printed = new Set();

console.log('🖨️  SkyTrack Print Service');
console.log(`   Yazıcı: ${PRINTER_NAME}`);
console.log(`   Sunucu: ${SOCKET_URL}\n`);

function printLabel(customerId, displayId, customerName, pilotName, eventTime) {
  // Bugünden eski kayıtları atla
  if (eventTime && eventTime.split('T')[0] !== today()) {
    console.log(`   ⏭️  ${displayId} atlandı (eski tarih: ${eventTime.split('T')[0]})`);
    return;
  }

  // Aynı etiketi iki kez basma
  if (printed.has(displayId)) {
    console.log(`   ⏭️  ${displayId} zaten yazdırıldı`);
    return;
  }
  printed.add(displayId);

  const start = Date.now();
  const pdfPath = path.join(tmpDir, `${displayId}.pdf`);
  const url = `${API_URL}/customers/${customerId}/label?token=${TOKEN}`;

  const req = https.get(url, { agent }, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      https.get(res.headers.location, { agent }, (res2) => {
        const chunks = [];
        res2.on('data', c => chunks.push(c));
        res2.on('end', () => { fs.writeFileSync(pdfPath, Buffer.concat(chunks)); sendToPrinter(pdfPath, displayId, customerName, pilotName, start); });
      }).on('error', () => {});
      return;
    }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => { fs.writeFileSync(pdfPath, Buffer.concat(chunks)); sendToPrinter(pdfPath, displayId, customerName, pilotName, start); });
  });
  req.on('error', (e) => console.error(`   ❌ ${displayId} indirme hatası: ${e.message}`));
}

function sendToPrinter(pdfPath, displayId, customerName, pilotName, start) {
  try { if (fs.statSync(pdfPath).size < 500) { console.log(`   ⚠️  ${displayId} PDF çok küçük`); return; } } catch { return; }
  exec(`lp -d "${PRINTER_NAME}" -o media=Custom.58x58mm -o fit-to-page "${pdfPath}"`, (err) => {
    const ms = Date.now() - start;
    if (err) console.error(`   ❌ ${displayId} yazıcı hatası: ${err.message}`);
    else console.log(`   ✅ ${displayId} - ${customerName} | Pilot: ${pilotName || '-'} (${ms}ms)`);
    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 2000);
  });
}

// Gece yarısı printed set'ini temizle
setInterval(() => { printed.clear(); }, 3600000);

// Socket.IO
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  rejectUnauthorized: false,
});

socket.on('connect', () => {
  console.log('✅ Bağlandı');
  socket.emit('join:room', 'admin');
});

socket.on('disconnect', () => console.log('❌ Bağlantı kesildi...'));

socket.on('print:label', (data) => {
  if (!data?.customerId) return;
  printLabel(data.customerId, data.displayId, data.customerName, data.pilotName, data.createdAt || new Date().toISOString());
});

process.on('SIGINT', () => { socket.disconnect(); process.exit(0); });
console.log('🔄 Dinleniyor...\n');

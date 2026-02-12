#!/bin/bash

# SkyTrack - Tüm Servisleri Başlat
# Kullanım: ./scripts/start-all.sh

set -e

echo "🚀 SkyTrack Sistemi Başlatılıyor..."
echo ""

# Root dizinine git
cd "$(dirname "$0")/.."

# 1. Docker Servisleri
echo "📦 Docker servisleri başlatılıyor..."
docker-compose up -d

# Docker healthy olana kadar bekle
echo "⏳ PostgreSQL ve Redis başlatılıyor (10 saniye)..."
sleep 10

# Health check
if ! docker ps | grep -q "skytrack-db.*healthy"; then
    echo "❌ PostgreSQL başlatılamadı!"
    exit 1
fi

if ! docker ps | grep -q "skytrack-redis.*healthy"; then
    echo "❌ Redis başlatılamadı!"
    exit 1
fi

echo "✅ PostgreSQL ve Redis hazır"
echo ""

# 2. Express API
echo "🔌 Express API başlatılıyor..."
npm run dev:api > /tmp/skytrack-api.log 2>&1 &
API_PID=$!
echo "   API PID: $API_PID"

# API başlayana kadar bekle
echo "⏳ API başlatılıyor (5 saniye)..."
sleep 5

if ! lsof -i :3001 | grep -q LISTEN; then
    echo "❌ API başlatılamadı! Log: /tmp/skytrack-api.log"
    exit 1
fi

echo "✅ API hazır: https://192.168.1.11:3001"
echo ""

# 3. Next.js Web
echo "🌐 Next.js Web başlatılıyor..."
npm run dev:web:https > /tmp/skytrack-web.log 2>&1 &
WEB_PID=$!
echo "   Web PID: $WEB_PID"

# Web başlayana kadar bekle
echo "⏳ Web başlatılıyor (10 saniye)..."
sleep 10

if ! lsof -i :3000 | grep -q LISTEN; then
    echo "❌ Web başlatılamadı! Log: /tmp/skytrack-web.log"
    exit 1
fi

echo "✅ Web hazır: https://192.168.1.11:3000"
echo ""

# 4. Cloudflare Tunnel
echo "🌍 Cloudflare Tunnel başlatılıyor..."
cloudflared tunnel run skytrack > /tmp/skytrack-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

# Tunnel bağlanana kadar bekle
echo "⏳ Tunnel bağlanıyor (5 saniye)..."
sleep 5

if ! ps -p $TUNNEL_PID > /dev/null; then
    echo "❌ Tunnel başlatılamadı! Log: /tmp/skytrack-tunnel.log"
    exit 1
fi

echo "✅ Tunnel hazır: https://skytrackyp.com"
echo ""

# Final rapor
echo "════════════════════════════════════════════════════════"
echo "🎉 SkyTrack Başarıyla Başlatıldı!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Servis Durumu:"
echo "   ✅ PostgreSQL (port 5432)"
echo "   ✅ Redis (port 6379)"
echo "   ✅ Express API (port 3001) - PID: $API_PID"
echo "   ✅ Next.js Web (port 3000) - PID: $WEB_PID"
echo "   ✅ Cloudflare Tunnel - PID: $TUNNEL_PID"
echo ""
echo "🌐 Erişim Adresleri:"
echo "   • Custom Domain: https://skytrackyp.com"
echo "   • API: https://api.skytrackyp.com"
echo "   • Yerel (LAN): https://192.168.1.11:3000"
echo ""
echo "🔐 Giriş:"
echo "   • Admin: admin / admin123"
echo "   • Ofis: ofis / ofis123"
echo "   • Pilot: pilot1 / pilot123"
echo ""
echo "📝 Loglar:"
echo "   • API: /tmp/skytrack-api.log"
echo "   • Web: /tmp/skytrack-web.log"
echo "   • Tunnel: /tmp/skytrack-tunnel.log"
echo ""
echo "🛑 Durdurmak için: ./scripts/stop-all.sh"
echo "════════════════════════════════════════════════════════"

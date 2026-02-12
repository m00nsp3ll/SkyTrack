#!/bin/bash

# SkyTrack - Tüm Servisleri Durdur
# Kullanım: ./scripts/stop-all.sh

echo "🛑 SkyTrack Sistemi Durduruluyor..."
echo ""

# 1. Node.js servisleri durdur
echo "📦 Node.js servisleri durduruluyor..."
pkill -f "npm run dev:api" && echo "   ✅ API durduruldu" || echo "   ⚠️ API zaten durdurulmuş"
pkill -f "npm run dev:web" && echo "   ✅ Web durduruldu" || echo "   ⚠️ Web zaten durdurulmuş"
echo ""

# 2. Cloudflare Tunnel durdur
echo "🌍 Cloudflare Tunnel durduruluyor..."
pkill cloudflared && echo "   ✅ Tunnel durduruldu" || echo "   ⚠️ Tunnel zaten durdurulmuş"
echo ""

# 3. Docker servisleri durdur
echo "🐳 Docker servisleri durduruluyor..."
docker-compose down
echo ""

# Kontrol
echo "════════════════════════════════════════════════════════"
echo "✅ Tüm Servisler Durduruldu"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Kontrol:"
docker ps | grep skytrack && echo "⚠️ Bazı container'lar hala çalışıyor" || echo "✅ Docker servisleri temiz"
lsof -i :3000 -i :3001 | grep LISTEN && echo "⚠️ Bazı portlar hala kullanımda" || echo "✅ Portlar temiz"
ps aux | grep cloudflared | grep -v grep && echo "⚠️ Cloudflare Tunnel hala çalışıyor" || echo "✅ Tunnel temiz"
echo ""

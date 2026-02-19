#!/bin/bash

# SkyTrack - Tüm Servisleri Başlat
# Kullanım: ./scripts/start-all.sh

cd "$(dirname "$0")/.."

echo "🚀 SkyTrack Sistemi Başlatılıyor..."
echo ""

# --- Yardımcı fonksiyon: retry ile port bekle ---
wait_for_port() {
    local port=$1
    local name=$2
    local max=$3
    for i in $(seq 1 $max); do
        if lsof -i :$port | grep -q LISTEN; then
            return 0
        fi
        sleep 1
        echo -n "."
    done
    return 1
}

# --- 1. Docker Desktop ---
echo "🐳 Docker kontrol ediliyor..."
if ! docker info > /dev/null 2>&1; then
    echo "   Docker çalışmıyor, başlatılıyor..."
    open -a Docker
    echo -n "⏳ Docker Desktop açılıyor"
    for i in $(seq 1 60); do
        sleep 1
        echo -n "."
        if docker info > /dev/null 2>&1; then
            echo ""
            echo "✅ Docker hazır"
            break
        fi
        if [ $i -eq 60 ]; then
            echo ""
            echo "❌ Docker 60 saniyede başlatılamadı! Docker Desktop'ı manuel açın."
            exit 1
        fi
    done
else
    echo "✅ Docker zaten çalışıyor"
fi
echo ""

# --- 2. PostgreSQL + Redis ---
echo "📦 PostgreSQL ve Redis başlatılıyor..."
docker-compose up -d

# PostgreSQL'e bağlanana kadar bekle (max 60 sn)
echo -n "⏳ PostgreSQL bekleniyor"
PG_READY=0
for i in $(seq 1 60); do
    sleep 1
    echo -n "."
    if docker exec skytrack-db pg_isready -U skytrack > /dev/null 2>&1; then
        PG_READY=1
        break
    fi
done
echo ""

if [ $PG_READY -eq 0 ]; then
    echo "❌ PostgreSQL 60 saniyede hazır olmadı!"
    echo "   Log: docker logs skytrack-db"
    exit 1
fi
echo "✅ PostgreSQL hazır"

# Redis kontrolü (max 30 sn)
echo -n "⏳ Redis bekleniyor"
REDIS_READY=0
for i in $(seq 1 30); do
    sleep 1
    echo -n "."
    if docker exec skytrack-redis redis-cli ping > /dev/null 2>&1; then
        REDIS_READY=1
        break
    fi
done
echo ""

if [ $REDIS_READY -eq 0 ]; then
    echo "❌ Redis 30 saniyede hazır olmadı!"
    echo "   Log: docker logs skytrack-redis"
    exit 1
fi
echo "✅ Redis hazır"
echo ""

# --- 3. Express API ---
echo "🔌 Express API başlatılıyor..."
npm run dev:api > /tmp/skytrack-api.log 2>&1 &
API_PID=$!

echo -n "⏳ API bekleniyor"
if wait_for_port 3001 "API" 60; then
    echo ""
    echo "✅ API hazır (PID: $API_PID)"
else
    echo ""
    echo "❌ API 60 saniyede başlatılamadı!"
    echo "   Log: tail -50 /tmp/skytrack-api.log"
    kill $API_PID 2>/dev/null
    exit 1
fi
echo ""

# --- 4. Next.js Web ---
echo "🌐 Next.js Web başlatılıyor..."
npm run dev:web:https > /tmp/skytrack-web.log 2>&1 &
WEB_PID=$!

echo -n "⏳ Web bekleniyor"
if wait_for_port 3000 "Web" 120; then
    echo ""
    echo "✅ Web hazır (PID: $WEB_PID)"
else
    echo ""
    echo "❌ Web 120 saniyede başlatılamadı!"
    echo "   Log: tail -50 /tmp/skytrack-web.log"
    kill $WEB_PID 2>/dev/null
    exit 1
fi
echo ""

# --- 5. Cloudflare Tunnel ---
echo "🌍 Cloudflare Tunnel başlatılıyor..."
cloudflared tunnel run skytrack > /tmp/skytrack-tunnel.log 2>&1 &
TUNNEL_PID=$!

echo -n "⏳ Tunnel bekleniyor"
TUNNEL_READY=0
for i in $(seq 1 30); do
    sleep 1
    echo -n "."
    if ps -p $TUNNEL_PID > /dev/null 2>&1; then
        TUNNEL_READY=1
        break
    fi
done
echo ""

if [ $TUNNEL_READY -eq 0 ]; then
    echo "❌ Tunnel başlatılamadı!"
    echo "   Log: tail -20 /tmp/skytrack-tunnel.log"
    exit 1
fi
echo "✅ Tunnel hazır (PID: $TUNNEL_PID)"
echo ""

# --- Final Rapor ---
echo "════════════════════════════════════════════════════════"
echo "  SkyTrack Başarıyla Başlatıldı!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Servis Durumu:"
echo "   ✅ PostgreSQL (port 5432)"
echo "   ✅ Redis     (port 6379)"
echo "   ✅ API       (port 3001) - PID: $API_PID"
echo "   ✅ Web       (port 3000) - PID: $WEB_PID"
echo "   ✅ Tunnel                - PID: $TUNNEL_PID"
echo ""
echo "🌐 Erişim:"
echo "   • https://skytrackyp.com"
echo "   • https://api.skytrackyp.com"
echo "   • https://192.168.1.11:3000 (LAN)"
echo ""
echo "🔐 Giriş:"
echo "   • Admin: admin / admin123"
echo "   • Ofis:  ofis / ofis123"
echo "   • Pilot: pilot1 / pilot123"
echo ""
echo "📝 Loglar:"
echo "   • tail -f /tmp/skytrack-api.log"
echo "   • tail -f /tmp/skytrack-web.log"
echo "   • tail -f /tmp/skytrack-tunnel.log"
echo ""
echo "🛑 Durdurmak için: ./scripts/stop-all.sh"
echo "════════════════════════════════════════════════════════"

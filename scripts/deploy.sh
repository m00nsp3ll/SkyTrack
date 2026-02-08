#!/bin/bash
# SkyTrack Deploy Script
# Run this to deploy updates

set -e

echo "🚀 SkyTrack Deploy Başlıyor..."

PROJECT_DIR="/home/skytrack/parasut"
cd "$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Git pull (varsa)...${NC}"
if [ -d ".git" ]; then
    git pull origin main || true
fi

echo -e "${YELLOW}2. Bağımlılıklar güncelleniyor...${NC}"
npm install

echo -e "${YELLOW}3. Prisma migrate...${NC}"
npm run db:generate
npm run db:migrate

echo -e "${YELLOW}4. Frontend derleniyor...${NC}"
npm run build --workspace=@skytrack/web

echo -e "${YELLOW}5. PM2 yeniden başlatılıyor...${NC}"
pm2 restart all

echo -e "${YELLOW}6. Nginx yeniden yükleniyor...${NC}"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Deploy tamamlandı!${NC}"
echo ""
pm2 status

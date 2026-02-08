#!/bin/bash
# SkyTrack Initial Setup Script
# Run this script on a fresh Ubuntu/Debian server

set -e

echo "🚀 SkyTrack Kurulum Başlıyor..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script root olarak çalıştırılmalı${NC}"
    echo "Kullanım: sudo ./setup.sh"
    exit 1
fi

# Get server IP
read -p "Sunucu IP adresi (varsayılan: 192.168.1.100): " SERVER_IP
SERVER_IP=${SERVER_IP:-192.168.1.100}

# Get database password
read -sp "PostgreSQL şifresi: " DB_PASSWORD
echo
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Şifre boş olamaz${NC}"
    exit 1
fi

# Get JWT secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${YELLOW}1. Sistem güncellemesi...${NC}"
apt-get update && apt-get upgrade -y

echo ""
echo -e "${YELLOW}2. Gerekli paketler kuruluyor...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    ffmpeg \
    postgresql \
    postgresql-contrib \
    redis-server

# Install Node.js 20 LTS
echo ""
echo -e "${YELLOW}3. Node.js 20 kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
echo ""
echo -e "${YELLOW}4. PM2 kuruluyor...${NC}"
npm install -g pm2

# Create skytrack user
echo ""
echo -e "${YELLOW}5. skytrack kullanıcısı oluşturuluyor...${NC}"
if ! id "skytrack" &>/dev/null; then
    useradd -m -s /bin/bash skytrack
fi

# Setup PostgreSQL
echo ""
echo -e "${YELLOW}6. PostgreSQL ayarlanıyor...${NC}"
sudo -u postgres psql -c "CREATE USER skytrack WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE skytrack OWNER skytrack;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE skytrack TO skytrack;"

# Setup Redis
echo ""
echo -e "${YELLOW}7. Redis ayarlanıyor...${NC}"
systemctl enable redis-server
systemctl start redis-server

# Create directories
echo ""
echo -e "${YELLOW}8. Klasörler oluşturuluyor...${NC}"
mkdir -p /home/skytrack/parasut
mkdir -p /home/skytrack/parasut/media
mkdir -p /home/skytrack/parasut/logs
mkdir -p /backups
chown -R skytrack:skytrack /home/skytrack
chown -R skytrack:skytrack /backups

# Copy project files (assumes script is run from project root)
echo ""
echo -e "${YELLOW}9. Proje dosyaları kopyalanıyor...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -d "$PROJECT_DIR/packages" ]; then
    cp -r "$PROJECT_DIR"/* /home/skytrack/parasut/
    chown -R skytrack:skytrack /home/skytrack/parasut
fi

# Create .env file
echo ""
echo -e "${YELLOW}10. Ortam değişkenleri ayarlanıyor...${NC}"
cat > /home/skytrack/parasut/.env << EOF
NODE_ENV=production
SERVER_IP=$SERVER_IP
SERVER_PORT=3001
DATABASE_URL=postgresql://skytrack:$DB_PASSWORD@localhost:5432/skytrack
REDIS_URL=redis://localhost:6379
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
NEXT_PUBLIC_API_URL=http://$SERVER_IP/api
NEXT_PUBLIC_SERVER_IP=$SERVER_IP
MEDIA_STORAGE_PATH=./media
MAX_FILE_SIZE=524288000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MAX_DAILY_FLIGHTS=7
EOF
chown skytrack:skytrack /home/skytrack/parasut/.env

# Install dependencies
echo ""
echo -e "${YELLOW}11. Bağımlılıklar kuruluyor...${NC}"
cd /home/skytrack/parasut
sudo -u skytrack npm install

# Setup database
echo ""
echo -e "${YELLOW}12. Veritabanı hazırlanıyor...${NC}"
cd /home/skytrack/parasut
sudo -u skytrack npm run db:generate
sudo -u skytrack npm run db:migrate
sudo -u skytrack npm run db:seed

# Build frontend
echo ""
echo -e "${YELLOW}13. Frontend derleniyor...${NC}"
cd /home/skytrack/parasut
sudo -u skytrack npm run build --workspace=@skytrack/web

# Setup Nginx
echo ""
echo -e "${YELLOW}14. Nginx ayarlanıyor...${NC}"
cp /home/skytrack/parasut/nginx/skytrack.conf /etc/nginx/sites-available/skytrack
ln -sf /etc/nginx/sites-available/skytrack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
sed -i "s|/home/skytrack/parasut/media/|/home/skytrack/parasut/media/|g" /etc/nginx/sites-available/skytrack
nginx -t && systemctl reload nginx

# Setup PM2
echo ""
echo -e "${YELLOW}15. PM2 ayarlanıyor...${NC}"
cd /home/skytrack/parasut
sudo -u skytrack pm2 start ecosystem.config.js
sudo -u skytrack pm2 save
pm2 startup systemd -u skytrack --hp /home/skytrack

# Setup daily backup cron
echo ""
echo -e "${YELLOW}16. Otomatik yedekleme ayarlanıyor...${NC}"
(crontab -u skytrack -l 2>/dev/null; echo "0 3 * * * /home/skytrack/parasut/scripts/backup.sh") | crontab -u skytrack -

# Final message
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ SkyTrack kurulumu tamamlandı!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Erişim bilgileri:"
echo "  - Web: http://$SERVER_IP"
echo "  - API: http://$SERVER_IP/api"
echo ""
echo "Giriş bilgileri:"
echo "  - Admin: admin / admin123"
echo "  - Pilot: ahmet / pilot123"
echo ""
echo "Önemli komutlar:"
echo "  - Durumu görüntüle: pm2 status"
echo "  - Logları görüntüle: pm2 logs"
echo "  - Yeniden başlat: pm2 restart all"
echo ""
echo -e "${YELLOW}⚠️  Üretim ortamında admin şifresini değiştirmeyi unutmayın!${NC}"

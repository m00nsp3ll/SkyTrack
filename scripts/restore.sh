#!/bin/bash
# SkyTrack Restore Script
# Restores database and media from backup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/home/skytrack/parasut"
BACKUP_DIR="/backups"

# Check arguments
if [ -z "$1" ]; then
    echo "Kullanım: ./restore.sh <backup-folder>"
    echo ""
    echo "Mevcut yedekler:"
    ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | while read dir; do
        echo "  - $(basename "$dir")"
    done
    exit 1
fi

BACKUP_PATH="$BACKUP_DIR/$1"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}Yedek bulunamadı: $BACKUP_PATH${NC}"
    exit 1
fi

echo -e "${RED}⚠️  DİKKAT: Bu işlem mevcut verilerin üzerine yazacak!${NC}"
read -p "Devam etmek istiyor musunuz? (evet/hayır): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
    echo "İptal edildi."
    exit 0
fi

# Load environment
source "$PROJECT_DIR/.env"

echo ""
echo "🔄 SkyTrack Geri Yükleme Başlıyor..."
echo "Yedek: $1"

# Stop services
echo -e "${YELLOW}1. Servisler durduruluyor...${NC}"
pm2 stop all || true

# Restore database
echo -e "${YELLOW}2. Veritabanı geri yükleniyor...${NC}"
if [ -f "$BACKUP_PATH/database.sql.gz" ]; then
    gunzip -c "$BACKUP_PATH/database.sql.gz" | psql "$DATABASE_URL"
    echo -e "${GREEN}   ✓ Veritabanı geri yüklendi${NC}"
else
    echo -e "${RED}   ✗ database.sql.gz bulunamadı${NC}"
fi

# Restore media
echo -e "${YELLOW}3. Medya dosyaları geri yükleniyor...${NC}"
if [ -f "$BACKUP_PATH/media.tar.gz" ]; then
    rm -rf "$PROJECT_DIR/media"
    tar -xzf "$BACKUP_PATH/media.tar.gz" -C "$PROJECT_DIR"
    echo -e "${GREEN}   ✓ Medya dosyaları geri yüklendi${NC}"
else
    echo -e "${YELLOW}   ⚠ media.tar.gz bulunamadı${NC}"
fi

# Start services
echo -e "${YELLOW}4. Servisler başlatılıyor...${NC}"
pm2 start all

echo ""
echo -e "${GREEN}✅ Geri yükleme tamamlandı!${NC}"
pm2 status

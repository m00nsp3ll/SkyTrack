#!/bin/bash
# SkyTrack Backup Script
# Creates a backup of database and media files

set -e

# Configuration
PROJECT_DIR="/home/skytrack/parasut"
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔄 SkyTrack Yedekleme Başlıyor..."
echo "Tarih: $DATE"

# Load environment variables
source "$PROJECT_DIR/.env"

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Backup PostgreSQL
echo -e "${YELLOW}1. PostgreSQL yedekleniyor...${NC}"
pg_dump "$DATABASE_URL" > "$BACKUP_PATH/database.sql"
gzip "$BACKUP_PATH/database.sql"
echo -e "${GREEN}   ✓ database.sql.gz oluşturuldu${NC}"

# Backup media files
echo -e "${YELLOW}2. Medya dosyaları yedekleniyor...${NC}"
if [ -d "$PROJECT_DIR/media" ]; then
    tar -czf "$BACKUP_PATH/media.tar.gz" -C "$PROJECT_DIR" media
    echo -e "${GREEN}   ✓ media.tar.gz oluşturuldu${NC}"
else
    echo -e "${YELLOW}   ⚠ Medya klasörü bulunamadı${NC}"
fi

# Backup .env file
echo -e "${YELLOW}3. Yapılandırma yedekleniyor...${NC}"
cp "$PROJECT_DIR/.env" "$BACKUP_PATH/env.backup"
echo -e "${GREEN}   ✓ env.backup oluşturuldu${NC}"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

# Clean old backups
echo -e "${YELLOW}4. Eski yedekler temizleniyor (${RETENTION_DAYS} günden eski)...${NC}"
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# List remaining backups
BACKUP_COUNT=$(ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | wc -l)

echo ""
echo -e "${GREEN}✅ Yedekleme tamamlandı!${NC}"
echo "   Konum: $BACKUP_PATH"
echo "   Boyut: $BACKUP_SIZE"
echo "   Toplam yedek: $BACKUP_COUNT"

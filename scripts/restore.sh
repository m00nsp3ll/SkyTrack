#!/bin/bash
# SkyTrack Restore Script
# Restores database from local or NAS backup
# Kullanım: ./restore.sh <backup-folder> [--from-nas]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/skytrack"
BACKUP_DIR="/backups"

# NAS Configuration (VDS → NAS external SSH)
NAS_HOST="skytrack.myqnapcloud.com"
NAS_USER="admin"
NAS_PASS="parasut26"
NAS_BACKUP_DIR="/share/skytrack-backups"
NAS_SSH_PORT=2222

FROM_NAS=false
if [ "$2" = "--from-nas" ]; then
    FROM_NAS=true
fi

# Check arguments
if [ -z "$1" ]; then
    echo "Kullanım: ./restore.sh <backup-folder> [--from-nas]"
    echo ""
    echo "Lokal yedekler:"
    ls -1d "$BACKUP_DIR"/20*/ 2>/dev/null | while read dir; do
        SIZE=$(du -sh "$dir" | cut -f1)
        echo "  - $(basename "$dir")  ($SIZE)"
    done
    echo ""
    echo "NAS yedekleri görmek için:"
    echo "  sshpass -p '$NAS_PASS' ssh -p $NAS_SSH_PORT ${NAS_USER}@${NAS_HOST} 'ls -1 $NAS_BACKUP_DIR/'"
    exit 1
fi

BACKUP_NAME="$1"

if [ "$FROM_NAS" = true ]; then
    echo -e "${YELLOW}NAS'tan yedek indiriliyor...${NC}"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    NAS_SSH="sshpass -p $NAS_PASS ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p $NAS_SSH_PORT ${NAS_USER}@${NAS_HOST}"
    # NAS'taki dosyaları listele ve SSH cat ile indir (SCP subsystem QNAP'ta kapalı)
    for FNAME in $($NAS_SSH "ls $NAS_BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null); do
        $NAS_SSH "cat $NAS_BACKUP_DIR/$BACKUP_NAME/$FNAME" > "$BACKUP_DIR/$BACKUP_NAME/$FNAME"
    done
    echo -e "${GREEN}   ✓ NAS'tan indirildi${NC}"
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}Yedek bulunamadı: $BACKUP_PATH${NC}"
    echo "NAS'tan almak için: ./restore.sh $BACKUP_NAME --from-nas"
    exit 1
fi

echo -e "${RED}⚠️  DİKKAT: Bu işlem mevcut veritabanının üzerine yazacak!${NC}"
echo "Yedek: $BACKUP_NAME"
echo "İçerik:"
ls -lh "$BACKUP_PATH"/
echo ""
read -p "Devam etmek istiyor musunuz? (evet/hayır): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
    echo "İptal edildi."
    exit 0
fi

# Load environment
source "$PROJECT_DIR/packages/api/.env"

echo ""
echo "🔄 SkyTrack Geri Yükleme Başlıyor..."

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
    exit 1
fi

# Restore .env if needed
if [ -f "$BACKUP_PATH/api.env.backup" ]; then
    echo -e "${YELLOW}3. .env dosyaları kontrol ediliyor...${NC}"
    echo -e "${YELLOW}   Mevcut .env korunuyor, yedek: $BACKUP_PATH/api.env.backup${NC}"
fi

# Restore firebase credentials if missing
if [ -f "$BACKUP_PATH/firebase-service-account.json" ] && [ ! -f "$PROJECT_DIR/firebase-service-account.json" ]; then
    cp "$BACKUP_PATH/firebase-service-account.json" "$PROJECT_DIR/firebase-service-account.json"
    echo -e "${GREEN}   ✓ firebase-service-account.json geri yüklendi${NC}"
fi

# Start services
echo -e "${YELLOW}4. Servisler başlatılıyor...${NC}"
pm2 start all

echo ""
echo -e "${GREEN}✅ Geri yükleme tamamlandı!${NC}"
pm2 status

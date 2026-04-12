#!/bin/bash
# SkyTrack Backup Script
# PostgreSQL dump → VDS lokal + NAS'a SCP
# Medya zaten NAS'ta, sadece DB + .env yedeklenir
# Crontab: 0 3 * * * /opt/skytrack/scripts/backup.sh >> /var/log/skytrack-backup.log 2>&1

set -e

# Configuration
PROJECT_DIR="/opt/skytrack"
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
RETENTION_DAYS=7

# NAS Configuration (VDS → NAS external SSH, mevcut medya sistemiyle aynı yol)
NAS_HOST="skytrack.myqnapcloud.com"
NAS_USER="admin"
NAS_PASS="parasut26"
NAS_BACKUP_DIR="/share/skytrack-backups"
NAS_SSH_PORT=2222

# Colors (sadece interactive modda)
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'
else
    GREEN='' YELLOW='' RED='' NC=''
fi

log() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log "${YELLOW}SkyTrack Yedekleme Başlıyor...${NC}"

# Load environment variables
ENV_FILE="$PROJECT_DIR/packages/api/.env"
source "$ENV_FILE"

# Create local backup directory
mkdir -p "$BACKUP_PATH"

# 1. Backup PostgreSQL
log "${YELLOW}1. PostgreSQL yedekleniyor...${NC}"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_PATH/database.sql.gz"
DB_SIZE=$(du -sh "$BACKUP_PATH/database.sql.gz" | cut -f1)
log "${GREEN}   ✓ database.sql.gz ($DB_SIZE)${NC}"

# 2. Backup .env + firebase credentials
log "${YELLOW}2. Yapılandırma yedekleniyor...${NC}"
cp "$ENV_FILE" "$BACKUP_PATH/api.env.backup"
if [ -f "$PROJECT_DIR/packages/web/.env.local" ]; then
    cp "$PROJECT_DIR/packages/web/.env.local" "$BACKUP_PATH/web.env.backup"
fi
if [ -f "$PROJECT_DIR/firebase-service-account.json" ]; then
    cp "$PROJECT_DIR/firebase-service-account.json" "$BACKUP_PATH/firebase-service-account.json"
fi
log "${GREEN}   ✓ Yapılandırma dosyaları kopyalandı${NC}"

# 3. SCP to NAS (web root dışında, HTTP'den erişilemez)
log "${YELLOW}3. NAS'a yedekleniyor ($NAS_IP:$NAS_BACKUP_DIR)...${NC}"
NAS_OK=false

# NAS'ta backup klasörünü oluştur
if sshpass -p "$NAS_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o PreferredAuthentications=password -p $NAS_SSH_PORT ${NAS_USER}@${NAS_HOST} "mkdir -p $NAS_BACKUP_DIR/$DATE" 2>/dev/null; then
    # Dosyaları kopyala
    if sshpass -p "$NAS_PASS" scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o PreferredAuthentications=password -P $NAS_SSH_PORT "$BACKUP_PATH"/* ${NAS_USER}@${NAS_HOST}:${NAS_BACKUP_DIR}/${DATE}/ 2>/dev/null; then
        NAS_OK=true
        log "${GREEN}   ✓ NAS'a kopyalandı${NC}"

        # NAS'ta eski yedekleri temizle
        sshpass -p "$NAS_PASS" ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p $NAS_SSH_PORT ${NAS_USER}@${NAS_HOST} "find $NAS_BACKUP_DIR -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;" 2>/dev/null || true
        log "${GREEN}   ✓ NAS eski yedekler temizlendi (${RETENTION_DAYS} gün)${NC}"
    else
        log "${RED}   ✗ NAS SCP başarısız${NC}"
    fi
else
    log "${RED}   ✗ NAS SSH bağlantısı başarısız${NC}"
fi

# 4. Clean old local backups
log "${YELLOW}4. Lokal eski yedekler temizleniyor...${NC}"
find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# Summary
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
LOCAL_COUNT=$(ls -1d "$BACKUP_DIR"/20*/ 2>/dev/null | wc -l | tr -d ' ')

log ""
log "${GREEN}✅ Yedekleme tamamlandı!${NC}"
log "   Lokal: $BACKUP_PATH ($BACKUP_SIZE)"
log "   Lokal yedek sayısı: $LOCAL_COUNT"
if [ "$NAS_OK" = true ]; then
    log "   NAS: $NAS_BACKUP_DIR/$DATE ✓"
else
    log "${RED}   NAS: BAŞARISIZ — lokal yedek mevcut${NC}"
fi

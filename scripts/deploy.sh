#!/bin/bash
# SkyTrack Safe Deploy — Build fail olursa site CANLI kalır
# Kullanım: /opt/skytrack/scripts/deploy.sh [api|web|all]

set -e

TARGET="${1:-all}"
PROJECT_DIR="/opt/skytrack"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
ok() { log "${GREEN}✓ $1${NC}"; }
err() { log "${RED}✗ $1${NC}"; }

cd "$PROJECT_DIR"

log "${YELLOW}Git pull...${NC}"
git checkout -- . 2>/dev/null || true
git pull origin main
ok "Git güncel"

if [ "$TARGET" = "api" ] || [ "$TARGET" = "all" ]; then
  log "${YELLOW}API build...${NC}"
  cd "$PROJECT_DIR/packages/api"
  if npm run build 2>&1 | tail -20; then
    ok "API build başarılı"
    pm2 restart skytrack-api
    ok "API restart edildi"
  else
    err "API BUILD BAŞARISIZ — restart YAPILMADI, eski versiyon canlı"
    exit 1
  fi
fi

if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
  log "${YELLOW}Web build (eski .next yedekleniyor)...${NC}"
  cd "$PROJECT_DIR/packages/web"

  # .next yedekle — build fail ederse eski kalır, site çalışmaya devam eder
  if [ -d .next ]; then
    rm -rf .next.backup 2>/dev/null || true
    cp -r .next .next.backup
  fi

  if npm run build 2>&1 | tail -20; then
    ok "Web build başarılı"
    rm -rf .next.backup 2>/dev/null || true
    pm2 restart skytrack-web
    ok "Web restart edildi"
  else
    err "WEB BUILD BAŞARISIZ — eski versiyon geri yükleniyor"
    if [ -d .next.backup ]; then
      rm -rf .next
      mv .next.backup .next
      ok "Eski .next geri yüklendi — site KESİNTİSİZ çalışmaya devam"
    fi
    exit 1
  fi
fi

ok "DEPLOY TAMAMLANDI"
pm2 list

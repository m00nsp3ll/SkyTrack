#!/bin/bash

# SkyTrack - Sunum için Demo Data Yükle
# Kullanım: ./scripts/seed-demo.sh
#
# Bu script:
#   1. Veritabanını sıfırlar (tüm mevcut veri silinir!)
#   2. Migration'ları uygular
#   3. Demo data yükler (100 pilot, 100 müşteri, uçuşlar, satışlar...)

set -e

cd "$(dirname "$0")/.."

echo "════════════════════════════════════════════════════════"
echo "  SkyTrack - Sunum Demo Data Yükleme"
echo "════════════════════════════════════════════════════════"
echo ""
echo "⚠️  DİKKAT: Bu işlem veritabanındaki TÜM mevcut veriyi siler!"
echo ""
read -p "Devam etmek istiyor musunuz? (e/H): " confirm
if [[ "$confirm" != "e" && "$confirm" != "E" ]]; then
    echo "İptal edildi."
    exit 0
fi

echo ""

# PostgreSQL çalışıyor mu kontrol et
echo "🔍 PostgreSQL kontrol ediliyor..."
if ! docker ps | grep -q "skytrack-db"; then
    echo "❌ PostgreSQL çalışmıyor. Önce sistemi başlatın:"
    echo "   ./scripts/start-all.sh"
    exit 1
fi
echo "✅ PostgreSQL hazır"
echo ""

# Migration uygula
echo "🔄 Migration uygulanıyor..."
cd packages/api
npx prisma migrate deploy
echo "✅ Migration tamamlandı"
echo ""

# Seed çalıştır
echo "🌱 Demo data yükleniyor..."
echo "   (Bu işlem 1-2 dakika sürebilir)"
echo ""
npx tsx prisma/seed.ts
echo ""
echo "✅ Demo data yüklendi"
echo ""

cd ../..

echo "════════════════════════════════════════════════════════"
echo "  Demo Data Hazır!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Yüklenen Veriler:"
echo "   • 100 Pilot (tümü aktif)"
echo "   • 100 Müşteri (çeşitli durumlar)"
echo "   • 80 Uçuş kaydı"
echo "   • 95 Satış kaydı"
echo "   • 17 Ürün (POS)"
echo ""
echo "🔐 Giriş Bilgileri:"
echo "   • Admin:  admin / admin123"
echo "   • Ofis:   ofis / ofis123"
echo "   • Medya:  medya / medya123"
echo "   • Harun:  harun / harun123"
echo "   • Pilot:  pilot1 / pilot123"
echo ""
echo "🌐 Erişim:"
echo "   • https://skytrackyp.com"
echo "   • https://192.168.1.11:3000"
echo "════════════════════════════════════════════════════════"

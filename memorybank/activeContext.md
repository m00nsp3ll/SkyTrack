# Active Context

## Current Focus
Phase 6 Completed - Ready for Phase 7: Reporting & Admin

## What Was Built (Phase 5 & 6)

### Phase 5: Media Management

**Backend - packages/api/src/services/media.ts:**
- `generateImageThumbnail()` - Sharp ile 300px JPEG thumbnail
- `generateVideoThumbnail()` - FFmpeg ile video first-frame thumbnail
- `scanAndProcessFolder()` - GoPro dosyalarını işleme
- `listMediaFiles()` - Dosya listesi ve meta bilgileri
- `getDiskStats()` - Disk kullanım istatistikleri

**Backend - packages/api/src/routes/media.ts:**
- POST /api/media/upload/:customerId - Multer ile dosya yükleme (500MB limit)
- POST /api/media/:customerId/scan - Klasör tarama ve thumbnail oluşturma
- GET /api/media/:customerId - Medya klasörü bilgisi
- GET /api/media/:customerId/files - Dosya listesi (URL'lerle)
- GET /api/media/:customerId/download - ZIP indirme (ödeme kontrolü)
- GET /api/media/:customerId/download/:filename - Tekil dosya indirme
- PATCH /api/media/:customerId/payment - Ödeme durumu güncelle
- PATCH /api/media/:customerId/delivery - Teslimat durumu güncelle
- GET /api/media/folders - Tüm klasörler (pagination)
- GET /api/media/stats/today - Günlük istatistikler

**Frontend Pages:**
- /admin/media - Admin medya yönetimi (liste, filtre, istatistikler)
- /admin/media/seller - Medya satış paneli (QR ara, dosya göster, ödeme al)
- /c/[displayId] - Müşteri galerisi (tam ekran, swipe, indirme)

### Phase 6: POS System

**Prisma Schema Updates:**
- Product model: stock, lowStockAlert, isFavorite, sortOrder, imageUrl, createdAt, updatedAt
- MediaFolder model: paymentStatus (String), deliveryStatus (String), totalSizeBytes (BigInt)

**Backend - packages/api/src/routes/products.ts:**
- GET /api/products - Ürün listesi (kategori, aktif, favori filtreleri)
- GET /api/products/categories - Kategori listesi
- GET /api/products/favorites - Favori ürünler
- GET /api/products/:id - Ürün detay
- POST /api/products - Ürün ekle
- PUT /api/products/:id - Ürün güncelle
- PATCH /api/products/:id/toggle - Aktif/pasif toggle
- PATCH /api/products/:id/favorite - Favori toggle
- PATCH /api/products/:id/stock - Stok güncelle
- PATCH /api/products/:id/price - Hızlı fiyat güncelle
- DELETE /api/products/:id - Ürün sil

**Backend - packages/api/src/routes/sales.ts:**
- POST /api/sales - Satış oluştur (stok otomatik azalır)
- GET /api/sales - Satış listesi (pagination, filtreler)
- GET /api/sales/customer/:customerId - Müşteri satış geçmişi
- GET /api/sales/unpaid - Ödenmemiş satışlar (müşteri bazında gruplu)
- GET /api/sales/daily-report - Günlük kasa raporu
- PATCH /api/sales/:id/payment - Ödeme durumu güncelle
- POST /api/sales/bulk-pay/:customerId - Toplu ödeme
- DELETE /api/sales/:id - Satış iptal

**Frontend Pages:**
- /admin/products - Ürün kataloğu (inline fiyat düzenleme, toggle, favoriler)
- /admin/products/new - Yeni ürün ekleme
- /pos - POS satış ekranı (3 sütun: müşteri, ürünler, sepet)
- /admin/sales/unpaid - Ödenmemiş satışlar takibi
- /admin/sales/daily - Günlük kasa raporu

**Sidebar Updated:**
- POS Satış (/pos)
- Ürün Kataloğu (/admin/products)
- Kasa Raporu (/admin/sales/daily)
- Ödenmemişler (/admin/sales/unpaid)
- Medya Yönetimi (/admin/media)
- Medya Satış (/admin/media/seller)

## Login Credentials (Seed Data)
- **Admin**: username: `admin`, password: `admin123`
- **Pilots**:
  - username: `ahmet`, password: `pilot123`
  - username: `mehmet`, password: `pilot123`
  - username: `ali`, password: `pilot123`

## How to Run

1. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client & run migrations:
```bash
npm run db:generate
npm run db:migrate
```

4. Seed the database:
```bash
npm run db:seed
```

5. Start development servers:
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Next Steps (Phase 7: Reporting & Admin)
1. Daily operations dashboard (tüm veriler tek yerde)
2. Pilot performance stats (uçuş sayıları, ortalama süre)
3. Revenue reports (medya + POS birleşik)
4. Customer flow analytics (saatlik dağılım, dönüşüm)
5. Export to Excel/PDF

## Important Context
- This runs on a LOCAL SERVER on a WiFi network
- All URLs in QR codes use local IP: `http://192.168.1.100/...`
- Configured via SERVER_IP in .env
- No internet dependency for core features
- Mobile-first, Turkish UI
- Socket.IO for real-time updates
- Media stored locally in /media folder
- POS optimized for tablet and desktop

## Blockers / Open Questions
- None - Ready for Phase 7

# Tech Architecture - SkyTrack

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.IO |
| Auth | JWT (jsonwebtoken) |
| QR Code | qrcode (generate), html5-qrcode (scan) |
| PDF | pdfkit |
| Image | sharp (thumbnails) |
| Video | fluent-ffmpeg, @ffmpeg-installer/ffmpeg |

## Proje Yapısı

```
parasut/
├── packages/
│   ├── api/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, error handling
│   │   │   └── utils/       # Helpers
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── media/           # Medya dosyaları
│   │
│   └── web/                 # Next.js frontend
│       ├── app/
│       │   ├── (dashboard)/ # Admin panel
│       │   ├── pilot/       # Pilot panel
│       │   ├── pos/         # POS satış
│       │   └── c/[id]/      # Müşteri landing page
│       ├── components/
│       ├── lib/
│       └── hooks/
│
├── certs/                   # SSL sertifikaları
├── memory-bank/             # Proje dokümantasyonu
└── CLAUDE.md
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Giriş
- `POST /api/auth/register` - Kayıt (admin only)
- `GET /api/auth/me` - Mevcut kullanıcı

### Customers
- `GET /api/customers` - Liste
- `GET /api/customers/:id` - Detay
- `POST /api/customers` - Yeni kayıt
- `PUT /api/customers/:id` - Güncelle
- `GET /api/customers/:id/waiver-pdf` - Risk formu indir

### Pilots
- `GET /api/pilots` - Liste
- `GET /api/pilots/:id` - Detay (tarih filtreli)
- `GET /api/pilots/queue` - Sıra durumu
- `POST /api/pilots` - Yeni pilot
- `PUT /api/pilots/:id` - Güncelle
- `PATCH /api/pilots/:id/status` - Durum değiştir

### Flights
- `GET /api/flights` - Liste
- `GET /api/flights/live` - Canlı takip
- `PATCH /api/flights/:id/status` - Durum güncelle

### Media
- `GET /api/media/folders` - Klasör listesi
- `GET /api/media/stats/today` - Günlük istatistik
- `GET /api/media/storage` - Disk kullanımı
- `GET /api/media/:customerId` - Müşteri medyası
- `POST /api/media/upload/:customerId` - Yükleme

## Veritabanı Şeması (Özet)

```
User (id, username, password, role, pilotId?)
Pilot (id, name, phone, status, dailyFlightCount, maxDailyFlights, queuePosition)
Customer (id, displayId, firstName, lastName, phone, weight, waiverSigned, signatureData)
Flight (id, customerId, pilotId, status, takeoffAt, landingAt)
MediaFolder (id, flightId, customerId, pilotId, folderPath, fileCount, paymentStatus, deliveryStatus)
Sale (id, customerId, items, total, paymentMethod)
Product (id, name, price, category)
```

## Ortam Değişkenleri

```env
DATABASE_URL=postgresql://skytrack:skytrack@localhost:5432/skytrack
SERVER_IP=192.168.1.100
SERVER_PORT=3001
WEB_PORT=3000
JWT_SECRET=your-secret-key
MEDIA_STORAGE_PATH=./media
MAX_DAILY_FLIGHTS=7
```

## Ağ Mimarisi

```
┌─────────────────────────────────────────┐
│              LAN (192.168.1.x)          │
│                                         │
│  ┌─────────┐   ┌─────────┐   ┌───────┐ │
│  │ Telefon │   │ Tablet  │   │ Laptop│ │
│  │ Müşteri │   │ Admin   │   │ Pilot │ │
│  └────┬────┘   └────┬────┘   └───┬───┘ │
│       │             │            │      │
│       └─────────────┼────────────┘      │
│                     │                   │
│              ┌──────┴──────┐            │
│              │   Sunucu    │            │
│              │ :3000 :3001 │            │
│              │  PostgreSQL │            │
│              │   ./media/  │            │
│              └─────────────┘            │
└─────────────────────────────────────────┘
```

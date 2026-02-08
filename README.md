# SkyTrack 🪂

**Yamaç Paraşütü Kooperatifi Yönetim Sistemi**

SkyTrack, yamaç paraşütü operasyonlarını yönetmek için tasarlanmış tam kapsamlı bir web uygulamasıdır. Müşteri kaydı, pilot rotasyonu, uçuş takibi, medya yönetimi ve POS satış işlemlerini QR kodlar aracılığıyla yerel ağ üzerinde gerçekleştirir.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## ✨ Özellikler

### Müşteri Yönetimi
- 📝 Hızlı müşteri kaydı ve onay formu
- 🔲 Otomatik QR kod oluşturma
- 📱 Mobil uyumlu müşteri sayfası

### Pilot Sistemi
- 👨‍✈️ Adil pilot rotasyonu (round-robin)
- 📊 Günlük uçuş limiti takibi
- 📱 Mobil pilot paneli (PWA)
- 🔔 Gerçek zamanlı bildirimler

### Uçuş Takibi
- ✈️ Canlı uçuş durumu
- ⏱️ Süre takibi ve uyarılar
- 📈 Saatlik dağılım grafikleri

### Medya Yönetimi
- 📷 Fotoğraf/video yükleme
- 🖼️ Otomatik thumbnail oluşturma
- 💳 Medya satış paneli
- 📥 Müşteri indirme portalı

### POS Satış
- 🛒 Hızlı satış ekranı
- 📦 Ürün ve stok yönetimi
- 💰 Çoklu ödeme yöntemleri
- 📋 Veresiye takibi

### Raporlama
- 📊 Gerçek zamanlı dashboard
- 👨‍✈️ Pilot performans analizi
- 💵 Gelir raporları
- 📈 Müşteri akış analizi

## 🛠️ Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | Express.js, Prisma ORM |
| Veritabanı | PostgreSQL 15 |
| Cache | Redis 7 |
| Gerçek Zamanlı | Socket.IO |
| Grafikler | Recharts |
| QR | qrcode, html5-qrcode |
| Medya | Sharp, FFmpeg |

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- FFmpeg

### Kurulum

1. **Repoyu klonlayın:**
```bash
git clone https://github.com/m00nsp3ll/SkyTrack.git
cd SkyTrack
```

2. **Ortam değişkenlerini ayarlayın:**
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

3. **Docker ile veritabanlarını başlatın:**
```bash
docker-compose up -d
```

4. **Bağımlılıkları yükleyin:**
```bash
npm install
```

5. **Veritabanını hazırlayın:**
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

6. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

7. **Tarayıcıda açın:**
- Frontend: http://localhost:3000
- API: http://localhost:3001

### Varsayılan Giriş Bilgileri
| Rol | Kullanıcı | Şifre |
|-----|-----------|-------|
| Admin | admin | admin123 |
| Pilot | ahmet | pilot123 |

## 📁 Proje Yapısı

```
parasut/
├── packages/
│   ├── api/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoint'leri
│   │   │   ├── middleware/  # Auth, validation, error handling
│   │   │   ├── services/    # İş mantığı (cache, media, queue)
│   │   │   ├── socket/      # Socket.IO events
│   │   │   └── cron/        # Zamanlanmış görevler
│   │   └── prisma/          # Veritabanı şeması
│   └── web/                 # Next.js frontend
│       ├── app/             # App Router sayfaları
│       ├── components/      # React bileşenleri
│       ├── hooks/           # Custom hooks
│       └── lib/             # Utilities, API client
├── nginx/                   # Nginx yapılandırması
├── scripts/                 # Deploy ve backup scriptleri
├── docs/                    # Dokümantasyon
└── docker-compose.yml       # Docker yapılandırması
```

## 🔌 API Endpoint'leri

### Auth
- `POST /api/auth/login` - Giriş
- `GET /api/auth/me` - Kullanıcı bilgisi

### Customers
- `GET /api/customers` - Liste
- `POST /api/customers` - Yeni kayıt
- `GET /api/customers/:id` - Detay

### Pilots
- `GET /api/pilots` - Liste
- `GET /api/pilots/queue` - Sıra durumu
- `GET /api/pilots/:id/panel` - Pilot paneli

### Flights
- `GET /api/flights` - Liste
- `GET /api/flights/live` - Aktif uçuşlar
- `PATCH /api/flights/:id/status` - Durum güncelle

### Media
- `POST /api/media/upload/:customerId` - Dosya yükle
- `GET /api/media/:customerId/files` - Dosya listesi
- `GET /api/media/:customerId/download` - ZIP indir

### Sales
- `POST /api/sales` - Satış oluştur
- `GET /api/sales/daily-report` - Günlük rapor

### Reports
- `GET /api/reports/dashboard` - Dashboard verileri
- `GET /api/reports/pilots` - Pilot performansı
- `GET /api/reports/revenue` - Gelir raporu

## 🖥️ Production Deploy

### Otomatik Kurulum
```bash
sudo ./scripts/setup.sh
```

### PM2 ile Çalıştırma
```bash
pm2 start ecosystem.config.js
```

### Nginx Yapılandırması
```bash
sudo cp nginx/skytrack.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/skytrack.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 📋 Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | PostgreSQL bağlantısı | - |
| `REDIS_URL` | Redis bağlantısı | redis://localhost:6379 |
| `JWT_SECRET` | JWT şifreleme anahtarı | - |
| `SERVER_IP` | Sunucu IP adresi | 192.168.1.100 |
| `SERVER_PORT` | API port | 3001 |
| `MAX_DAILY_FLIGHTS` | Günlük pilot limiti | 7 |

## 🔄 Yedekleme

### Manuel Yedekleme
```bash
./scripts/backup.sh
```

### Geri Yükleme
```bash
./scripts/restore.sh 2026-02-07_03-00-00
```

## 📖 Dokümantasyon

- [Kullanım Kılavuzu (Türkçe)](docs/kullanim-kilavuzu.md)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👥 Ekip

Geliştirici: [m00nsp3ll](https://github.com/m00nsp3ll)

---

**SkyTrack** - Gökyüzünde güvenle uçun! 🪂

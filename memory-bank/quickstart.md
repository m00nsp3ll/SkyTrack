# SkyTrack Hızlı Başlatma Rehberi

## 🚀 Tek Komutla Tüm Sistemi Başlat

### Otomatik Başlatma (Önerilen)
```bash
# Root dizinde çalıştır
./scripts/start-all.sh
```

### Manuel Başlatma (Adım Adım)

#### 1. Docker Servisleri (PostgreSQL + Redis)
```bash
docker-compose up -d
```
**Kontrol:** `docker ps | grep skytrack`
- skytrack-db (port 5432) - HEALTHY olmalı
- skytrack-redis (port 6379) - HEALTHY olmalı

#### 2. Backend (Express API)
```bash
npm run dev:api &
```
**Kontrol:** `lsof -i :3001 | grep LISTEN`
**URL:** https://192.168.1.11:3001

#### 3. Frontend (Next.js)
```bash
npm run dev:web:https &
```
**Kontrol:** `lsof -i :3000 | grep LISTEN`
**URL:** https://192.168.1.11:3000

#### 4. Cloudflare Tunnel (Custom Domain)
```bash
cloudflared tunnel run skytrack &
```
**Kontrol:** `ps aux | grep cloudflared | grep -v grep`
**URL:** https://skytrackyp.com

---

## 🛑 Tüm Servisleri Durdur

```bash
# Node.js servislerini durdur
pkill -f "npm run dev:api"
pkill -f "npm run dev:web"

# Cloudflare Tunnel durdur
pkill cloudflared

# Docker servisleri durdur
docker-compose down
```

---

## ⚡ Hızlı Komutlar

### Servis Durumu Kontrol
```bash
# Tüm servisleri kontrol et
docker ps | grep skytrack
lsof -i :3000 -i :3001 | grep LISTEN
ps aux | grep cloudflared | grep -v grep
```

### Logları Kontrol Et
```bash
# Docker logları
docker logs skytrack-db
docker logs skytrack-redis

# Node.js logları (background task ID'leri ile)
# Background task output dosyalarını oku
```

### Veritabanı İşlemleri
```bash
# Migration çalıştır
npm run db:migrate

# Seed data ekle
npm run db:seed

# Prisma Studio aç
npm run db:studio
```

---

## 🔧 İlk Kurulum (Sadece Bir Kez)

### 1. Dependencies Yükle
```bash
npm install
```

### 2. .env Dosyasını Kontrol Et
```bash
# .env dosyasının olduğundan emin ol
cat .env | grep CUSTOM_DOMAIN
# CUSTOM_DOMAIN=skytrackyp.com olmalı
```

### 3. SSL Sertifikaları (Varsa)
```bash
# Self-signed sertifikalar certs/ klasöründe
ls -la certs/
```

### 4. Veritabanı İlk Kurulum
```bash
# Docker başlat
docker-compose up -d

# Migration çalıştır (ilk kez)
npm run db:migrate

# Demo data ekle
npm run db:seed
```

---

## 🌐 Erişim Bilgileri

### Custom Domain (İnternet Üzerinden)
- **Ana Site:** https://skytrackyp.com
- **API:** https://api.skytrackyp.com
- **Admin Panel:** https://skytrackyp.com/dashboard
- **Pilot Panel:** https://skytrackyp.com/pilot

### Yerel Ağ (LAN)
- **Ana Site:** https://192.168.1.11:3000
- **API:** https://192.168.1.11:3001

### Giriş Bilgileri
```
Admin: admin / admin123
Ofis: ofis / ofis123
Medya: medya / medya123
Pilot: pilot1-100 / pilot123
```

---

## 🐛 Sorun Giderme

### Port Çakışması (5432 zaten kullanımda)
```bash
# Çakışan PostgreSQL'i durdur
docker ps -a | grep postgres
docker stop orient-postgres
# Sonra skytrack-db'yi başlat
docker-compose up -d postgres
```

### Migration Hatası (tablolar bulunamadı)
```bash
# Veritabanını sıfırla
cd packages/api
npx prisma migrate reset --force
```

### Cloudflare Tunnel Bağlanamıyor
```bash
# Tunnel bilgilerini kontrol et
cloudflared tunnel list
# Tunnel config kontrol et
cat ~/.cloudflared/config.yml
```

### Node.js Servis Başlamıyor
```bash
# Port kontrol et
lsof -i :3000 -i :3001
# Çakışan process'i durdur
kill -9 <PID>
```

---

## 📝 Notlar

- **Veritabanı:** PostgreSQL container'ı ilk başlatmada 5-10 saniye sürebilir (healthcheck)
- **Next.js:** İlk build 20-30 saniye sürer, sonrası hızlıdır
- **Cloudflare Tunnel:** 4 bağlantı kurar (İstanbul veri merkezleri)
- **Redis:** Pilot kuyruk cache için kullanılır (30s TTL)

---

## 🔄 Production Başlatma

```bash
# Build al
npm run build

# Production modunda başlat
npm run start &

# Cloudflare Tunnel (production)
cloudflared tunnel run skytrack &
```

**PM2 ile başlatma (production):**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

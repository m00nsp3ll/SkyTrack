# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-11

### Yapılan İşler

1. **PWA Push → Firebase FCM Native Push Geçişi (TAMAMLANDI)**

   **Neden?** Android'de PWA push bildirimleri kilit ekranında görünmüyordu (battery optimization). Native push gerekiyordu.

   **Yapılan Değişiklikler:**

   a) **PWA Push Sistemi Devre Dışı Bırakıldı:**
      - `PushNotificationManager.tsx` → boş component (return null)
      - `/api/push/*` endpoint'leri → 410 Gone (deprecated mesajı)
      - `pilotQueue.ts` → tüm `sendPushToPilot` çağrıları kaldırıldı
      - Service Worker → push handler kaldırıldı, sadece caching aktif

   b) **FCM Birincil Kanal Yapıldı:**
      - `pilotQueue.ts` → sadece `sendNativeToPilot` kullanıyor
      - `flights.ts` → uçuş tamamlama bildirimi FCM ile
      - Firebase service account path düzeltildi (`process.cwd()`)

   c) **Admin Panel Yenilendi:**
      - `/admin/notifications` → tamamen yeniden yazıldı
      - PWA subscription yerine FCM token listesi
      - Android/iOS platform breakdown
      - Broadcast form (all/pilots/admins hedefleme)
      - Hızlı şablonlar (Günaydın, Hava durumu, Uçuş durdur/başlat)

   d) **Frontend FCM Handler'ları:**
      - `nativePush.ts` → akıllı routing eklendi
      - Notification type bazlı yönlendirme:
        - customer_assigned → /pilot
        - flight_completed → /pilot
        - broadcast → /admin
      - `InAppNotificationBanner.tsx` → uygulama açıkken banner
      - Dashboard layout'a entegre edildi

   **Ertelenen Özellikler:**
   - FCM token cleanup (geçersiz/eski tokenlar)
   - Admin cron job bildirimleri (uzun uçuş, medya yüklenmedi, ödeme bekliyor)

2. **Personel Rolleri ve Yetki Yönetimi** (Önceki Oturum)
   - CUSTOM (Özel Yetki) rolü eklendi
   - RolePermission modeli (grup/öğe bazlı izinler)
   - Personel Rolleri tabı (/admin/staff)
   - Sidebar rol bazlı menü filtreleme

3. **Capacitor.js Android Uygulaması** (Önceki Oturum)
   - APK build: `packages/web/android/app/build/outputs/apk/debug/app-debug.apk`
   - Firebase entegrasyonu (google-services.json)
   - Native push aktif

### Hızlı Başlatma Komutları

**Tek Komut (Önerilen):**
```bash
./scripts/start-all.sh
```

**Manuel Başlatma:**
```bash
docker-compose up -d
npm run dev:api &
npm run dev:web:https &
cloudflared tunnel run skytrack &
```

**Durdurma:**
```bash
./scripts/stop-all.sh
```

### Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `memory-bank/quickstart.md` | Hızlı başlatma rehberi (sorun giderme dahil) |
| `scripts/start-all.sh` | Otomatik başlatma scripti |
| `scripts/stop-all.sh` | Otomatik durdurma scripti |
| `packages/api/prisma/migrations/20260210143712_init/` | İlk migration |
| `.env` | CUSTOM_DOMAIN=skytrackyp.com |

### Cloudflare Tunnel Bilgileri

```yaml
tunnel: 4ef0fae8-2ca5-4900-9351-4fd95cf0135b
ingress:
  - hostname: skytrackyp.com → https://localhost:3000
  - hostname: www.skytrackyp.com → https://localhost:3000
  - hostname: api.skytrackyp.com → https://localhost:3001
```

### Erişim Bilgileri

**Custom Domain (İnternet):**
- https://skytrackyp.com
- https://api.skytrackyp.com

**Yerel Ağ (LAN):**
- https://192.168.1.11:3000
- https://192.168.1.11:3001

**Giriş:**
- Admin: admin / admin123
- Ofis: ofis / ofis123
- Medya: medya / medya123
- Pilot: pilot1-100 / pilot123

### Veritabanı Demo Data

- 100 Pilot (tümü aktif)
- 103 Kullanıcı (1 admin, 1 ofis, 1 medya, 100 pilot)
- 100 Müşteri (40 completed, 20 in_flight, 20 assigned, 15 registered, 5 cancelled)
- 80 Uçuş kaydı
- 95 Satış kaydı
- 17 Ürün (POS)

### Bildirim Sistemi Durum Özeti

**Aktif Bildirim Kanalları (Öncelik Sırası):**
1. **Firebase FCM** (PRIMARY) - Native Android/iOS push
2. **Socket.IO** (SECONDARY) - Gerçek zamanlı UI güncellemeleri
3. **WhatsApp** (OPTIONAL) - Manuel toplu mesaj (ileride)

**PWA Push** - DEPRECATED (410 Gone)

**Test Edildi:**
- ✅ Android APK native notification
- ✅ In-app banner (uygulama açıkken)
- ✅ Akıllı routing (notification type bazlı)
- ✅ Admin panel FCM token yönetimi

### Sonraki Adımlar

1. ~~iOS uygulama build~~ (ileride)
2. ~~FCM token cleanup~~ (ileride)
3. ~~Admin cron job bildirimleri~~ (ileride)
4. Raporlama modüllerini tamamla
5. PDF Türkçe font desteği ekle
6. Production deployment yapılandırması (PM2)

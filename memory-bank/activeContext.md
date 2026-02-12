# Active Context - SkyTrack

# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-12 (Oturum 2)

### Yapılan İşler

1. **NotificationsPage Icon Hatası Düzeltildi**

   **Sorun:** `Element type is invalid: expected a string... but got: object` hatası

   **Kök Neden:** Template'lerdeki `icon` alanı React component (fonksiyon) olduğu için localStorage'a serialize edilemiyor. Geri yüklendiğinde object'e dönüşüyor ve React render edemiyordu.

   **Çözüm:**
   - Template'lerden `icon` ve `iconColor` alanları kaldırıldı
   - `templateIconMap` ve `templateIconColorMap` oluşturuldu (id bazlı icon çekme)
   - Icon'lar artık localStorage'dan bağımsız, her zaman doğru component

2. **Pilot Sayfası Safe Area Boşluğu**

   **Sorun:** Mobil cihazlarda header notch/status bar'a denk geliyordu

   **Çözüm:**
   - Header'a `pt-[max(1rem,env(safe-area-inset-top))]` eklendi
   - Artık tüm mobil cihazlarda üst kısım düzgün görünüyor

3. **Paragliding Logosuyla APK Build**

   - `/Users/harunsivasli/Downloads/paragliding.png` → proje klasörüne kopyalandı
   - Python Pillow ile tüm Android ikon boyutlarına dönüştürüldü:
     - Standard icons: 48-192px (mdpi-xxxhdpi)
     - Adaptive icons: 108-432px foreground
   - Capacitor sync + Gradle build (Java 21)
   - APK: 5.6MB - `packages/web/android/app/build/outputs/apk/debug/app-debug.apk`

4. **Flights List UI İyileştirmesi** (`/admin/flights/list`)

   **Değişiklikler:**
   - Pilot adı → Bold, üstte (ana başlık)
   - Müşteri adı → Altında, gri tonunda + kilo bilgisi
   - Kalkış saati → Mavi uçak ikonu + `Kalkış: HH:MM`
   - İniş saati → Yeşil uçak ikonu + `İniş: HH:MM`
   - Süre → Saat ikonu + `X dk`

5. **Cloudflare Tunnel Yeniden Başlatıldı**

   - Tunnel durmuştu, kullanıcı siteye erişemiyordu
   - `cloudflared tunnel run skytrack` ile yeniden başlatıldı
   - 4 QUIC bağlantısı (Istanbul: ist03, ist04, ist07)

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
| `packages/api/src/services/cronJobs.ts` | FCM token cleanup cron jobs |
| `packages/web/lib/nativePush.ts` | FCM token yönetimi (refresh, cleanup) |
| `packages/api/src/routes/fcm.ts` | FCM API endpoints (register, refresh, broadcast) |
| `packages/api/src/services/firebaseNotification.ts` | FCM bildirim servisi |
| `packages/web/app/(dashboard)/admin/notifications/page.tsx` | Bildirim yönetim paneli |

### Bildirim Sistemi Durum Özeti

**Aktif Bildirim Kanalları (Öncelik Sırası):**
1. **Firebase FCM** (PRIMARY) - Native Android/iOS push
2. **Socket.IO** (SECONDARY) - Gerçek zamanlı UI güncellemeleri

**FCM Token Lifecycle:**
- Register: Login/app açılış → `/api/fcm/register`
- Refresh: Foreground (24h throttle) → `/api/fcm/refresh`
- Cleanup: Logout → `/api/fcm/unregister` + localStorage temizleme
- Auto-delete: Invalid token → sendNativeNotification hata yakalama
- Cron: 03:00 stale (30 gün), 03:30 inactive token silme

**Auth Sistemi:**
- JWT: 30 gün geçerli
- Cookie backup: 30 gün maxAge
- Akıllı interceptor: Sadece kesin auth hatalarında logout

### Sonraki Adımlar

1. Raporlama modüllerini tamamla
2. PDF Türkçe font desteği ekle
3. Production deployment yapılandırması (PM2)
4. iOS uygulama build (ileride)
5. Admin cron job bildirimleri (uzun uçuş, medya yüklenmedi, ödeme bekliyor)

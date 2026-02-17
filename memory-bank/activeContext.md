# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-17 (Oturum 11)

### Yapılan İşler

1. **nativePush.ts v3 — Tamamen Yeniden Yazıldı** ✅
   - `_fcmTokenDone` flag ile çift kayıt engelleme
   - `_nativeFCMToken` window property dinleme (AppDelegate'den)
   - `initialized` flag ile çift init engelleme
   - Auth token: parametre veya `localStorage.getItem('token')`
   - Hem `fcmToken` hem `nativeFCMToken` event'lerini dinliyor
   - Retry: 4s, 8s, 14s, 22s, 35s delay'lerle
   - `setInAppNotificationHandler` export eklendi (InAppNotificationBanner uyumluluğu)
   - `pushNotificationReceived` listener'ında `inAppHandler(n)` çağrısı
   - `cleanupFcmToken` backward compat alias korundu

2. **AppDelegate.swift — Çoklu Delay + Window Property** ✅
   - Token'ı 2s, 5s, 10s, 20s delay'lerle WebView'a inject ediyor
   - `window._nativeFCMToken = token` property set ediyor
   - Hem `fcmToken` hem `nativeFCMToken` CustomEvent dispatch ediyor

3. **Firebase Bildirim Servisi — APNs + iOS Desteği** ✅
   - `sendNativeNotification`: apns bloğu eklendi (alert, badge, sound, content-available, headers)
   - `sendNativeToAllPilots` ve `sendNativeBroadcast`: sendEachForMulticast → tek tek sendNativeNotification
   - Detaylı error logging (errorCode, errorInfo)

4. **APNs Key Yenilendi** ✅
   - Eski key revoke edildi
   - Yeni key oluşturuldu: Sandbox & Production, Team Scoped (All Topics)
   - Firebase Console'a yüklendi
   - `messaging/third-party-auth-error` hatası çözüldü

5. **Dashboard layout.tsx — 3s Delay ile Push Init** ✅
6. **Pilot page.tsx — Auth Token Parametre** ✅
7. **Seed Data Yüklendi** ✅ (sunum için)

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/lib/nativePush.ts` | v3: tamamen yeniden yazıldı, setInAppNotificationHandler, inAppHandler |
| `packages/web/ios/App/App/AppDelegate.swift` | Çoklu delay, _nativeFCMToken property, iki event |
| `packages/web/app/(dashboard)/layout.tsx` | 3s delay, auth token parametre |
| `packages/web/app/pilot/page.tsx` | initNativePush(token) parametre |
| `packages/api/src/services/firebaseNotification.ts` | apns bloğu, multicast→tektek, detaylı error log |

### Önemli Teknik Notlar

- **iOS Push Çalışıyor** ✅ — iPhone ve iPad'e bildirim başarıyla gönderiliyor
- **APNs Key:** Sandbox & Production, Team Scoped (All Topics)
- **Auth token key:** `localStorage.getItem('token')`
- **FCM API:** Express API (`api.skytrackyp.com`) port 3001, Bearer header auth
- **Sunucu:** LOKAL Mac — skytrackyp.com Cloudflare Tunnel ile lokale yönleniyor
- **Token Akışı:** AppDelegate → evaluateJavaScript → window._nativeFCMToken + CustomEvent → nativePush.ts → api.skytrackyp.com/api/fcm/register
- **Broadcast:** sendEachForMulticast kaldırıldı, tek tek sendNativeNotification kullanılıyor (iOS uyumluluğu)

### Sonraki Adımlar

- [ ] iOS bildirimde Türkçe karakter sorunu araştır (curl encoding)
- [ ] Admin cron job bildirimleri
- [ ] Production PM2 yapılandırması

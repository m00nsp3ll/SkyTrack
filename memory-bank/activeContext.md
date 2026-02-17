# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-17 (Oturum 8)

### Yapılan İşler

1. **iOS FCM Token → Backend Kayıt Düzeltmesi** ✅
   - Sorun: FCM token AppDelegate'de oluşuyor ama Capacitor plugin'in "registration" event'i tetiklenmiyordu
   - Neden: Firebase swizzling APNs token'ı kendisi yönetiyor, Capacitor plugin'ine iletmiyordu
   - Çözüm 1: AppDelegate.swift → FCM token'ı WebView'a `evaluateJavaScript` ile CustomEvent olarak gönder
   - Çözüm 2: nativePush.ts → `window.addEventListener('fcmToken')` ile native event dinleme (fallback)
   - Çözüm 3: 5 saniye sonra token yoksa `PushNotifications.register()` tekrar dene
   - Çözüm 4: Dashboard layout.tsx'e `initNativePush()` çağrısı eklendi (önceden sadece pilot sayfasında vardı)

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/lib/nativePush.ts` | Detaylı loglama, native fcmToken event dinleme, 5s retry, sendTokenToBackend ayrı fonksiyon |
| `packages/web/ios/App/App/AppDelegate.swift` | FCM token'ı CAPBridgeViewController üzerinden WebView'a JS ile gönder |
| `packages/web/app/(dashboard)/layout.tsx` | initNativePush() çağrısı eklendi (admin/ofis/medya paneli için) |

### Önemli Teknik Notlar

- **iOS FCM Token Akışı:** AppDelegate (Firebase) → evaluateJavaScript → CustomEvent('fcmToken') → nativePush.ts → backend /api/fcm/register
- **Çift Yol:** Capacitor registration event (Android'de çalışır) + Native JS event (iOS fallback)
- **initNativePush artık 2 yerde:** pilot/page.tsx + (dashboard)/layout.tsx
- **API Base URL:** skytrackyp.com → api.skytrackyp.com (getApiBaseUrl fonksiyonu)

### Sonraki Adımlar

1. iPad'de test: login → Xcode console'da "✅ FCM token registered successfully" görünmeli
2. Admin bildirimler sayfasında iOS cihaz görünmeli
3. Test bildirimi gönder
4. IPA çıkarma ve pilotlara dağıtım

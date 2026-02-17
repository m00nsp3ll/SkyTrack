# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-16 (Oturum 7)

### Yapılan İşler

1. **iOS Native App — Sıfırdan Oluşturuldu ve Çalıştırıldı** ✅
   - Eski ios/ klasörü silindi, `npx cap add ios` + `npx cap sync ios`
   - Capacitor 8.1.0, 4 plugin (App, LocalNotifications, PushNotifications, StatusBar)
   - SplashScreen plugin kaldırıldı (Xcode 26 storyboard uyumsuzluğu)

2. **Firebase iOS SDK Entegrasyonu** ✅
   - Package.swift: `firebase-ios-sdk` (11.0+) — FirebaseCore + FirebaseMessaging
   - AppDelegate.swift: FCM delegate, APNs token, foreground banner
   - `import FirebaseCore` + `import FirebaseMessaging` (SPM formatı)

3. **LaunchScreen Çözümü** ✅
   - Xcode 26 storyboard açamıyor → storyboard tamamen kaldırıldı
   - Info.plist'te `UILaunchScreen` boş dict kullanılıyor (storyboard gerektirmez)
   - SplashScreen plugin kaldırıldı (runtime'da storyboard arıyordu)
   - project.pbxproj'dan tüm LaunchScreen referansları temizlendi

4. **Kamera ve Medya İzinleri** ✅
   - NSCameraUsageDescription — QR kod tarama ve fotoğraf çekimi
   - NSPhotoLibraryUsageDescription — Medya dosyalarına erişim
   - NSMicrophoneUsageDescription — Video kaydı

5. **Diğer Yapılandırmalar** ✅
   - GoogleService-Info.plist kopyalandı
   - 1024x1024 universal app icon (Xcode 15+ tek dosya modu)
   - App.entitlements: aps-environment development
   - capacitor.config.ts: server.url = https://skytrackyp.com
   - fix-ios-firebase.js: cap sync sonrası Firebase koruması
   - iPhone + iPad desteği (TARGETED_DEVICE_FAMILY = "1,2")

### Önemli Teknik Notlar

- **Xcode 26 + storyboard = UYUMSUZ** — LaunchScreen.storyboard kullanılamaz
- **SplashScreen plugin = CRASH** — Runtime'da storyboard arar, plugin kaldırılmalı
- **`npx cap sync ios` her çalıştığında** Package.swift sıfırlanır → `node scripts/fix-ios-firebase.js` çalıştırılmalı
- **`npm run cap-sync-ios`** komutu ikisini birlikte çalıştırır

### Değiştirilen/Oluşturulan Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/ios/` | Sıfırdan oluşturuldu |
| `packages/web/ios/App/CapApp-SPM/Package.swift` | Firebase SDK eklendi |
| `packages/web/ios/App/App/AppDelegate.swift` | FCM push notification |
| `packages/web/ios/App/App/GoogleService-Info.plist` | Firebase config |
| `packages/web/ios/App/App/Info.plist` | UILaunchScreen, kamera izinleri, BackgroundModes |
| `packages/web/ios/App/App/App.entitlements` | APNs development |
| `packages/web/ios/App/App.xcodeproj/project.pbxproj` | LaunchScreen temizlendi |
| `packages/web/capacitor.config.ts` | skytrackyp.com, SplashScreen kaldırıldı |
| `packages/web/package.json` | SplashScreen kaldırıldı, cap-sync-ios eklendi |
| `packages/web/scripts/generate-single-icon.js` | İkon oluşturma |
| `packages/web/scripts/fix-ios-firebase.js` | Firebase koruma |

### Sonraki Adımlar

1. IPA çıkarma — Archive → Ad Hoc → Export
2. Pilotlara dağıtım (UDID kayıt + Ad Hoc profile)
3. App Store yükleme (ileride)

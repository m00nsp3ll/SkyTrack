# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-03-30 (Oturum 33)

### Yapılan İşler

1. **iOS Splash Screen Düzeltmesi** ✅
   - Sorun: iOS uygulaması açılışta mavi ekran + "APP" yazısı gösteriyordu
   - Kök neden: `UILaunchScreen` boş dict, `LaunchScreen.storyboard` eksik ve Xcode referansı yanlıştı
   - Çözüm:
     - `Info.plist`'e `UILaunchStoryboardName = LaunchScreen` eklendi
     - `LaunchScreen.storyboard` XML olarak elle oluşturuldu (`ios/App/LaunchScreen.storyboard`)
     - `SkyTrackLogo.png` `ios/App/` klasörüne kopyalandı, Xcode'a eklendi
     - Storyboard: koyu lacivert arka plan, ortada logo (%55 genişlik), üstte "Alanya Paragliding" (42pt bold beyaz, logodan 110pt yukarıda), altta "© Coded by Harun S." (15pt, yarı saydam)
   - `@capacitor/splash-screen` eklendi, config güncellendi

2. **Firebase iOS SDK Eklendi** ✅
   - FirebaseCore + FirebaseMessaging SPM üzerinden Xcode'a eklendi (v12.11.0)
   - Önceki build hataları çözüldü

3. **QNAP NAS - PDF Yedekleme** ✅ (Oturum 32)
   - Risk formu PDF'leri NAS'a otomatik yedekleniyor
   - Yol: `/share/skytrack-media/Risk_Formlari/YYYY-MM-DD/{displayId}/filename.pdf`
   - SSH stdin üzerinden dosya yükleme (SFTP devre dışı olduğu için)

4. **Deploy Planı — QNAP Cloud SSH** ⏳
   - TTNet CGN nedeniyle port yönlendirme çalışmıyor (WAN IP: 100.81.x.x)
   - Çözüm: TTNet'ten CGN çıkışı talep edilecek veya Tailscale kullanılacak
   - VDS deployment için QNAP_SSH_HOST = skytrack.myqnapcloud.com + port 2222

### Değiştirilen Dosyalar (Oturum 33)

| Dosya | İşlem |
|-------|-------|
| packages/web/ios/App/LaunchScreen.storyboard | Oluşturuldu (logo + yazılar) |
| packages/web/ios/App/SkyTrackLogo.png | Kopyalandı |
| packages/web/ios/App/App/Info.plist | UILaunchStoryboardName eklendi |
| packages/web/ios/App/App/Assets.xcassets/Splash.imageset/ | Logo görseli ile güncellendi |
| packages/web/capacitor.config.ts | SplashScreen plugin config eklendi, backgroundColor güncellendi |

### Kritik Teknik Bilgiler

#### iOS Splash Screen
- Kullanılan dosya: `ios/App/LaunchScreen.storyboard` (Xcode referansı buraya bakıyor)
- `ios/App/App/Base.lproj/LaunchScreen.storyboard` — eski/kullanılmayan dosya
- Logo: `ios/App/SkyTrackLogo.png` (Xcode projesine eklenmiş olmalı)
- `Info.plist`'te `UILaunchStoryboardName = LaunchScreen` olmalı (UILaunchScreen dict değil)

#### QNAP NAS
- LAN: `192.168.1.111:22` — çalışıyor ✅
- Cloud: `skytrack.myqnapcloud.com` — TTNet CGN nedeniyle kapalı ❌
- PDF yedek yolu: `/share/skytrack-media/Risk_Formlari/YYYY-MM-DD/{displayId}/`

#### Timezone
- API: `process.env.TZ = 'Europe/Istanbul'` index.ts'te ayarlı
- Frontend: `toLocalDateStr()` helper kullan, `toISOString()` KULLANMA

### Sonraki Adımlar

- [ ] TTNet CGN çıkışı talep et → port yönlendirme → VDS deploy
- [ ] Tailscale alternatif VPN çözümü (CGN çözülmezse)
- [ ] Sidebar'a "NAS" menü linki ekle
- [ ] iOS IPA çıkarma (Ad Hoc dağıtım)
- [ ] Production PM2 yapılandırması

# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-01 (Oturum 34)

### Yapılan İşler

1. **NAS Dual-Mode SSH** ✅
   - production (NODE_ENV=production) → skytrack.myqnapcloud.com:2222 (External)
   - development (NODE_ENV=development) → 192.168.1.109:22 (LAN)
   - qnapService.ts: sshConfig getter ile otomatik seçim

2. **NAS Klasör Açma — SMB** ✅
   - API artık exec/open komutu çalıştırmıyor
   - /api/media/:id/open-folder → { smbPath: "smb://192.168.1.109/skytrack-media/..." } döndürüyor
   - /api/media/pilot/:id/open-folder → aynı şekilde smbPath döndürüyor
   - Web: window.open(smbPath), başarısız olursa prompt() ile kopyalanabilir yol
   - Her zaman lokal IP (QNAP_LAN_IP) kullanılıyor — ofis işlemi olduğu için
   - child_process/exec kaldırıldı (güvenlik + mimari)

3. **Production Deploy — VDS (dehost.com.tr)** ⏳
   - Sunucu: 5.10.220.205, Ubuntu 24.04 LTS
   - PostgreSQL + Redis native kuruldu (Docker yok)
   - Node.js 20, PM2, Nginx, Certbot hazır
   - Repo: github.com/m00nsp3ll/SkyTrack (public)
   - TypeScript build hataları düzeltildi (CommonJS, ES2020, tip uyumsuzlukları)
   - @types/archiver, @types/web-push eklendi
   - tsconfig.json: strict=false, noImplicitAny=false, CommonJS modüle geçildi
   - Eksik: .env oluşturma, migration, PM2 başlatma, Nginx config, SSL

### Değiştirilen Dosyalar (Oturum 34)

| Dosya | İşlem |
|-------|-------|
| packages/api/src/services/qnapService.ts | Dual-mode SSH, getConnectionInfo(), smbPath desteği |
| packages/api/src/routes/nas.ts | testConnection response'a mode+host eklendi |
| packages/api/src/routes/media.ts | open-folder: exec kaldırıldı, smbPath döndürülüyor |
| packages/api/src/routes/flights.ts | Sale.items → include kaldırıldı (alan yok) |
| packages/api/src/services/cache.ts | Redis constructor düzeltildi |
| packages/api/src/services/media.ts | bigint + number fix (Number() cast) |
| packages/api/src/index.ts | server.listen tip cast |
| packages/api/tsconfig.json | CommonJS/ES2020, strict=false |
| packages/api/package.json | @types/archiver, @types/web-push eklendi |
| packages/web/app/(dashboard)/admin/nas/page.tsx | mode+host API'den gösteriliyor |
| packages/web/app/(dashboard)/admin/customers/[id]/page.tsx | handleOpenFolder → smbPath |
| packages/web/app/(dashboard)/admin/media/pos/page.tsx | handleOpenFolder → smbPath |
| packages/web/app/(dashboard)/admin/media/page.tsx | handleOpenFolder/Pilot → smbPath |

### Sonraki Adımlar (Deploy)

- [ ] Sunucuda .env oluştur (packages/api/.env)
- [ ] npx prisma migrate deploy
- [ ] PM2 ile API + Web başlat
- [ ] Nginx config (skytrackyp.com + api.skytrackyp.com)
- [ ] SSL (certbot)
- [ ] Cloudflare DNS → 5.10.220.205


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

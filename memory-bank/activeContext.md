# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-11 (Oturum 42) — ⚠️ KRİTİK GÜN

### 🔴 SUNUCU ÇÖKMESİ + SIFIRDAN KURULUM
- Dehost VDS (166.1.91.9) siyah ekran verdi, format atmak zorunda kaldık
- **Veritabanı yedeği YOKTU** (`scripts/backup.sh` crontab'a bağlanmamıştı — Post-Launch TODO'da kalmış)
- Tek kayıp: test müşteri verileri (müşteri kayıtları test'ti, üretim kullanımı yok)
- NAS'taki medya dosyaları + Risk Form PDF'leri güvendeydi (VDS dışında)

### ✅ Yeni sunucu kurulumu (30 dk, 2026-04-11)
- **IP:** 166.1.91.9 (aynı), **SSH şifresi YENİ:** `22a5c8d1113a!diyo@`
- Ubuntu 24.04, Node 24.14 (nvm), PM2 6.0, PostgreSQL 16, Redis, Nginx, certbot
- `prisma migrate deploy` + `prisma db push` (password_changed_at kolonu için)
- Let's Encrypt SSL: skytrackyp.com + api + www (2026-07-09'a kadar)
- UFW firewall: 22/80/443 açık, geri kalan kapalı
- Firebase service account lokal'den scp ile kopyalandı (+symlink /opt/skytrack/firebase-service-account.json)

### 🔐 Kimlik bilgileri (YENİ)
```
Admin:  admin / Aa19866891!
Kiosk:  kiosk / kiosk2026
```

### ✅ Production'a eklenen özellikler (bu oturum)
1. **Public pilot kayıt formu** — `https://skytrackyp.com/pilot-kayit?token=skytrack-pilot-2026-4139ca4d9634`
   - `POST /api/pilots/public-register` (token-protected, Pilot + User tek seferde)
   - Frontend: `app/pilot-kayit/page.tsx` — SkyTrack logo, gradient bg, success ekranında "uygulamayı aç + bildirim izni" yönlendirmesi
   - Token env: `PILOT_REGISTRATION_TOKEN` (prod .env'de)
2. **Pilot `appInstalled` field + istatistik** — schema'ya `appInstalled Boolean @default(false)`, form checkbox, `GET /api/pilots/registration-stats` (admin)
3. **FCM çift bildirim fix** — `/broadcast` hem `sendNativeToAllPilots` hem `sendNativeBroadcast` çağırıyordu (pilotlar 2 kez alıyordu). Artık pilot için `sendNativeToAllPilots`, pilot-dışı için paralel loop. Plus: FCM fonksiyonları sequential `for-await` yerine `Promise.all` ile paralel (24 cihaz ~8sn → ~1sn). Frontend axios timeout 15sn → 60sn
4. **18 ürün seed edildi** (6 içecek, 3 yiyecek, 5 hediyelik, 3 foto/video, 1 rest)
5. **Sidebar Apple-tarzı ince scrollbar** — `sidebar-scrollbar` utility class, 6px, slate-500/45% thumb
6. **Kiosk scrollbar gizleme + status bar renk override** — layout useEffect dinamik theme-color `#0ea5e9`

### ⚠️ Kiosk yazdırma — YARIM KALDI (yarına)
- iPad'de **SkyTrack native app (Capacitor 8) kullanılıyor**, browser değil
- WKWebView'da `window.print()` ve iframe yaklaşımı çalışmıyor (AirPrint tetiklenmiyor)
- **Custom Capacitor plugin yaratıldı:** `AppDelegate.swift` içine `AirPrintPlugin` class (CAPBridgedPlugin, UIPrintInteractionController) + `lib/airprint.ts` JS wrapper + kiosk page `Capacitor.isNativePlatform()` kontrolü
- **SORUN:** Custom in-app Capacitor plugin için Obj-C `CAP_PLUGIN` macro dosyası ŞART — sadece Swift class + CAPBridgedPlugin yetmiyor, plugin bridge'e kayıt olmuyor. `AirPrintPlugin.m` dosyası oluşturulmadı.
- **Yapılacak:** `ios/App/App/AirPrintPlugin.m` dosyası yarat (`CAP_PLUGIN(AirPrintPlugin, "AirPrint", CAP_PLUGIN_METHOD(print, CAPPluginReturnPromise))`), Xcode'da "Add Files to App..." ile target'a ekle, rebuild

### ⚠️ Splash screen — YARIM KALDI (yarına)
- Eski: kare logo + lacivert `#1a3a6b`
- Yeni istenen: iOS app icon tarzı **yuvarlak köşeli kare** logo + gradient (sky-500 → blue-600 → purple-600, kayıt ekranıyla aynı)
- **Yapıldı:** `Splash.imageset` yeni filename'lerle regenerate (skytrack-splash.png/@2x/@3x), 2732×2732, 760px logo, 170px radius (~%22 iOS icon oranı), 1.17 MB her biri. Contents.json güncellendi (eski filename'leri sil, yeni filename'leri ekle)
- **Yapıldı:** `LaunchScreen.storyboard` — ImageView full-screen constraints + scaleAspectFill
- **Yapıldı:** `capacitor.config.ts` — `backgroundColor: '#1a3a6b'` → `#0ea5e9`
- **SORUN:** Xcode build eski cache'li splash gösteriyor. DerivedData silindi ama build cache yine de eski. Yeni filename yaklaşımı bunu çözmeli ama henüz test edilmedi.
- **Yapılacak:** `npx cap sync ios` + Xcode Clean Build Folder + Run, iPad'de app'i tamamen sil yeniden yükle

### 🚨 KRİTİK TODO — ASLA UNUTMA
- **YEDEK SİSTEMİ KURULMADI** — `scripts/backup.sh`'i crontab'a bağla (her gece 03:00), yedekleri NAS'a scp, 7 gün rotation. Başka bir çöküş olursa yine aynı kayıp yaşanır.

### 🎯 Yarınki toplantı için durum (2026-04-11)
- 32 gerçek pilot kaydoldu (+ 10 ekstra listede olmayan kayıt, 15 eksik kayıt bekleniyor)
- Yazılıma giriş yapılabiliyor, POS ürünleri hazır, pilot kayıt linki dağıtıldı
- Kiosk yazdırma + splash screen: yarın toplantı öncesi Xcode rebuild ile bitirilecek

---

## Oturum 41 — LAN hızında indirme (2026-04-10)

### ✅ ÇÖZÜLDÜ — LAN hızında indirme aktif

**Mimari (yeni):** Müşteri (LAN/WAN) → modem (hairpin NAT veya WAN forward) → NAS HTTPS direkt
**VDS hiç yok** — sadece API çağrısı 302 redirect döndürüyor.

**Adımlar:**
1. NAS'ta Let's Encrypt SSL kuruldu (`skytrack.myqnapcloud.com`, expires 2026-07-08)
2. NAS Web Server Virtual Host: HTTPS port **8443**, doc root `/share/skytrack-media`
3. TP-Link router'da port forward: dış 8443 → 192.168.1.105:8443 TCP
4. Modem hairpin NAT zaten çalışıyor (LAN içinden public IP çağırınca kendine dönüyor)
5. NAS'ta `/usr/local/sbin/zip` mevcut — `/api/media/:id/download` endpoint'i artık NAS-side ZIP oluşturup `https://skytrack.myqnapcloud.com:8443/.zips/<displayId>/Alanya Paragliding.zip` URL'ine 302 redirect yapıyor
6. Müşteri direkt NAS'tan ZIP indirir: LAN → gigabit, WAN → ofis upload
7. ZIP'ler 24h sonra `cleanupOldZips()` ile silinir (best-effort, her download'da tetikleniyor)
8. NAS `.htaccess`: `Options -Indexes` (directory listing kapalı, güvenlik)

**Doğrulama (end-to-end):**
- `curl -I https://api.skytrackyp.com/api/media/A0072/download` → 302 → NAS HTTPS → 200, application/zip ✅
- Cert valid (Let's Encrypt), accept-ranges: bytes (mobile resume ✅), CORS aktif

### 🚨 ÖNCEKI (2026-04-09) — Çözüldü, referans için saklı

**Müşteri indirme sayfası VDS üzerinden indiriyor, ağ hızında değil!**

Şu an olan:
`Müşteri (WiFi) → api.skytrackyp.com (VDS) → NAS SSH → VDS → Müşteri`

Olması gereken:
`Müşteri (WiFi) → 192.168.1.105 (NAS direkt) → Müşteri`

**Sorun:** NAS sadece HTTP (port 8082) sunuyor. HTTPS sayfası (`skytrackyp.com`) HTTP kaynaklarına mixed content nedeniyle erişemiyor.

**Çözüm seçenekleri (yarın karar verilecek):**
1. **NAS'a Let's Encrypt SSL kur** → QNAP panelinde SSL sertifikası, subdomain ile HTTPS servis
2. **QNAP myqnapcloud subdomain** → `skytrack.myqnapcloud.com` zaten HTTPS verebiliyor, LAN'da da çalışır
3. **Cloudflare Tunnel NAS'a** → NAS üzerinde cloudflared çalıştır, subdomain yönlendir

**Mevcut durum (çalışıyor ama yavaş):**
- ZIP indirme çalışıyor ✅
- ZIP adı "Alanya Paragliding.zip" ✅  
- 2 dosya da ZIP içinde görünüyor ✅
- Ama VDS üzerinden geçiyor ❌ (ağ hızında değil)

**LAN detection çalışıyor:**
- Ofis public IP: `81.213.175.47`
- `GET /api/network/discover` → isLan: true/false
- Ama LAN tespiti yapılsa bile NAS'a SSL olmadan direkt bağlanamıyoruz

**NAS Virtual Host:**
- Port: 8082
- Doc root: `/share/skytrack-media`
- `.htaccess` CORS yazıldı (`Access-Control-Allow-Origin: *`)

---

### Bu Oturumda Yapılanlar

1. **ZIP indirme düzeltildi** ✅
   - ZIP endpoint'i artık NAS'tan SSH ile dosyaları çekiyor (VDS'deki boş `./media` klasörü değil)
   - `qnap.downloadFile()` metodu eklendi
   - Recursive alt klasör tarama eklendi
   - ZIP adı "Alanya Paragliding.zip" yapıldı

2. **API proxy endpoint eklendi** ✅
   - `GET /api/media/:customerId/proxy-file/:filename`
   - NAS'tan dosyayı SSH ile çekip müşteriye stream ediyor
   - SSL sorunu yok (API HTTPS üzerinde)

3. **lan-info endpoint güncellendi** ✅
   - NAS HTTP URL yerine API proxy URL döndürüyor
   - Recursive dosya listeleme

4. **NAS .htaccess CORS** ✅
   - `/share/skytrack-media/.htaccess` yazıldı
   - `Access-Control-Allow-Origin: *` aktif

---

### Production Sunucu Bilgileri
- **IP:** 166.1.91.9 (2026-04-10 değişti — eski 5.10.220.205, Dehost altyapı/routing sorunu)
- **Hostname:** skytrack-server
- **SSH:** `sshpass -p '22a5c8d1113a!diyo@' ssh -o StrictHostKeyChecking=no root@166.1.91.9`
- **Proje dizini:** /opt/skytrack
- **Node PATH:** `$(ls -d /root/.nvm/versions/node/*/bin | tail -1)`
- **PM2:** skytrack-api (id:4), skytrack-web (id:5)
- **Domain (önerilen erişim):** skytrackyp.com, api.skytrackyp.com, www.skytrackyp.com → 166.1.91.9
- **Deploy komutu:**
```bash
sshpass -p '22a5c8d1113a!diyo@' ssh -o StrictHostKeyChecking=no root@166.1.91.9 "export PATH=\$PATH:\$(ls -d /root/.nvm/versions/node/*/bin 2>/dev/null | tail -1) && cd /opt/skytrack && git pull origin main && cd packages/api && npm run build && pm2 restart skytrack-api && cd /opt/skytrack/packages/web && npm run build && pm2 restart skytrack-web && echo DONE"
```

### QNAP NAS Bilgileri
- **LAN IP:** 192.168.1.105
- **SSH:** `sshpass -p 'parasut26' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p 22 admin@192.168.1.105`
- **Medya yolu:** /share/skytrack-media
- **Virtual Host:** port 8082, doc root /share/skytrack-media

# Progress - SkyTrack Project

## Tamamlanan Özellikler

### Çekirdek Sistem
- [x] Next.js 14 + Express.js + PostgreSQL + Prisma kurulumu
- [x] JWT tabanlı kimlik doğrulama sistemi (30 gün geçerli token + cookie backup)
- [x] Socket.IO gerçek zamanlı iletişim
- [x] HTTPS desteği (self-signed certificate)
- [x] Dinamik IP algılama (LAN için)
- [x] Cloudflare Tunnel ile custom domain desteği (skytrackyp.com)

### Custom Domain & Deployment
- [x] Cloudflare Tunnel yapılandırması
- [x] skytrackyp.com ana domain
- [x] api.skytrackyp.com API subdomain
- [x] www.skytrackyp.com desteği
- [x] www → non-www otomatik yönlendirme (localStorage tutarlılığı için)
- [x] Dinamik URL hesaplama (tüm bileşenlerde)

### Müşteri Yönetimi
- [x] Müşteri kayıt formu (ad, soyad, telefon, kilo, acil iletişim)
- [x] Dijital imza özelliği (react-signature-canvas)
- [x] Risk formu PDF oluşturma (pdfkit)
- [x] QR kod oluşturma ve yazdırma
- [x] Müşteri detay sayfası
- [x] Müşteri listesi (arama, filtreleme, pagination)
- [x] Müşteri indirme sayfası (/c/[displayId])

### Pilot Yönetimi
- [x] Pilot CRUD işlemleri
- [x] Pilot durumları (Müsait, Uçuşta, Molada, Mesai Dışı)
- [x] Otomatik pilot atama (en az uçuş yapana öncelik)
- [x] Günlük uçuş limiti (max 7)
- [x] Pilot sırası yönetimi (drag & drop)
- [x] Pilot detay sayfası (toplam uçuş, tarih filtresi)
- [x] Pilot panel (mobil için)
- [x] Pilot panelinde sıra gösterimi (dinamik hesaplama)
- [x] Pilot profil sidebar (soldan açılan, animasyonlu)

### Uçuş Takibi
- [x] Canlı uçuş takip paneli
- [x] Uçuş durumları (Atandı, Alındı, Uçuşta, Tamamlandı, İptal)
- [x] Uçuş süresi takibi
- [x] Toplu iptal özelliği (hava muhalefeti)
- [x] Uçuş geçmişi listesi
- [x] Kartlara tıklayınca müşteri sayfasına yönlendirme

### QR Kod Sistemi
- [x] QR kod oluşturma (müşteri kayıt sonrası)
- [x] QR kod tarama (html5-qrcode)
- [x] HTTPS ile mobil kamera desteği
- [x] Custom domain ile QR URL oluşturma (skytrackyp.com/c/xxx)
- [x] Mevcut müşteri QR kodları güncelleme scripti

### Risk Formu
- [x] Dijital imza alma
- [x] PDF oluşturma (pdfkit)
- [x] PDF indirme endpoint'i
- [x] Depolama: `./media/Risk Formlari/{displayId}/{Ad Soyad} risk_formu.pdf`
- [x] Risk formu metni güncellendi (6 madde → 8 madde, kooperatif ve sigorta bilgileri eklendi)
- [x] Başlık: "Risk ve Sorumluluk Beyanı" → "Risk Kabul ve Sorumluluk Beyanı"
- [x] KVKK Aydınlatma Metni linki ve modalı eklendi (imza üstünde)
- [x] kvkkConsent + kvkkConsentAt DB alanları eklendi (imza ile otomatik true)
- [x] signatureData alanı @db.Text olarak güncellendi

### Çok Dilli Karşılama ve Kayıt Sistemi (2026-03-05)
- [x] Dil seçim ekranı (10 dil, bayraklı butonlar, SkyTrack origami logo)
- [x] Çeviri sistemi (lib/translations.ts — 10 dil, 50+ çeviri anahtarı)
- [x] Desteklenen diller: TR, EN, RU, DE, AR, PL, UK, ZH, FR, FA
- [x] RTL desteği (Arapça, Farsça — dir="rtl" ile layout mirror)
- [x] Kayıt formu tüm alanlar çevrildi (ad, soyad, telefon, kilo, vb.)
- [x] Risk formu 8 madde tüm dillerde çevrildi
- [x] KVKK metni ve linki çevrildi
- [x] İmza alanı etiketleri çevrildi (imzala, temizle, onayla, iptal)
- [x] Başarı ekranı çevrildi
- [x] Customer tablosuna `language` String @default("tr") eklendi
- [x] API'de language alanı kayıt sırasında set ediliyor
- [x] Form akışı: Dil seçimi → Bilgi girişi → Risk formu + İmza → QR sonuç
- [x] Ülke isimleri Intl.DisplayNames ile seçilen dile göre otomatik çeviri (ISO 3166-1)
- [x] Ülke arama placeholder ve "sonuç bulunamadı" metni çevrildi
- [x] Ülke dropdown click-outside kapanma (useEffect + ref)
- [x] İmza sonrası otomatik form submit (handleSignatureConfirm → submitRegistration)
- [x] Başarı ekranı sadeleştirildi (sadece QR Yazdır + Yeni Kayıt)
- [x] Risk formu PDF tek sayfa sığdırma (font/spacing optimize)

### Personel Yönetimi
- [x] Kullanıcı rolleri (ADMIN, OFFICE_STAFF, PILOT, MEDIA_SELLER, CUSTOM)
- [x] Personel CRUD işlemleri
- [x] Pilot-kullanıcı eşleştirme
- [x] Rol bazlı yetki yönetimi (RolePermission modeli)
- [x] Personel Rolleri paneli (grup/öğe bazında toggle)
- [x] Sidebar rol bazlı menü filtreleme
- [x] CUSTOM (Özel Yetki) rol desteği

### PWA ve Push Bildirimler (DEPRECATED - FCM'e Geçildi)
- [x] ~~Web Push Notification altyapısı (web-push + VAPID)~~ - DEPRECATED
- [x] ~~PushSubscription veritabanı modeli~~ - DEPRECATED
- [x] ~~Push notification servisi (sendPushToUser, sendPushToPilot, sendPushBroadcast)~~ - DEPRECATED
- [x] ~~Push API endpoint'leri (subscribe, unsubscribe, test, broadcast)~~ - DEPRECATED (410 Gone)
- [x] Service Worker (sadece caching için aktif, push disabled)
- [x] PWA manifest ve next-pwa yapılandırması
- [x] ~~Bildirim izin modal'ı (PushNotificationManager)~~ - Boş component
- [x] PWA kurulum rehberi (iOS talimatları dahil)

### Firebase FCM Native Push (PRIMARY - PWA Deprecated)
- [x] Capacitor.js kurulumu ve yapılandırması (com.skytrackyp.app)
- [x] Android projesi oluşturuldu
- [x] Firebase Admin SDK entegrasyonu (firebase-service-account.json)
- [x] FcmToken veritabanı modeli ve migration
- [x] FCM token kayıt/silme API endpoint'leri (/api/fcm/register, /unregister, /tokens)
- [x] Firebase notification servisi (sendNativeToPilot, sendNativeToUser, sendNativeBroadcast)
- [x] Frontend native push başlatma (nativePush.ts)
- [x] PWA Push sisteminden tam geçiş (tüm sendPushToPilot çağrıları kaldırıldı)
- [x] FCM bildirim tetikleyicileri (12 senaryo)
- [x] Admin FCM yönetim paneli (token listesi, broadcast, şablonlar)
- [x] In-app notification banner (uygulama açıkken)
- [x] Akıllı bildirim routing (notification type bazlı)
- [x] Debug APK build (5.6MB - paragliding.png logosuyla)
- [x] FCM token auto-refresh sistemi (foreground 24h throttle, backend refresh endpoint)
- [x] FCM token cleanup sistemi (cron jobs: 03:00 stale 30 gün, 03:30 inactive)
- [x] Logout FCM token cleanup (pilot page + sidebar → cleanupFcmToken)
- [x] Invalid token auto-delete (sendNativeNotification hata yakalama)
- [x] NotificationsPage localStorage serialize fix (templateIconMap)
- [x] iOS uygulama projesi oluşturuldu, cihazda çalıştırıldı (Capacitor + Firebase FCM)
- [x] iOS LaunchScreen storyboard kaldırıldı (Xcode 26 uyumsuzluğu → UILaunchScreen dict)
- [x] iOS SplashScreen plugin kaldırıldı (runtime storyboard crash)
- [x] iOS kamera/mikrofon/galeri izinleri eklendi
- [x] iOS IPA çıkarma hazır (Archive → Ad Hoc → Export)
- [x] iOS FCM token → backend kayıt düzeltmesi (AppDelegate → WebView JS bridge + native event fallback)
- [x] Dashboard layout'a initNativePush eklendi (önceden sadece pilot sayfasındaydı)
- [x] nativePush.ts v3: setInAppNotificationHandler, initialized flag, retry mekanizması
- [x] Firebase bildirim servisine APNs bloğu eklendi (iOS bildirim desteği)
- [x] sendEachForMulticast → tek tek sendNativeNotification (iOS uyumluluğu)
- [x] APNs key yenilendi (Sandbox & Production) — iOS push çalışıyor ✅
- [x] iPhone + iPad'e bildirim başarıyla gönderildi
- [ ] Admin cron job bildirimleri (ileride)

### DevOps & Automation (2025-02-10)
- [x] Hızlı başlatma sistemi (tek komutla tüm servisler)
- [x] Otomatik başlatma scripti (start-all.sh)
- [x] Otomatik durdurma scripti (stop-all.sh)
- [x] Veritabanı migration sistemi düzeltildi
- [x] Demo seed data (100 pilot, 100 müşteri, 80 uçuş)
- [x] Healthcheck ve hata yönetimi
- [x] Log dosyaları (/tmp/skytrack-*.log)
- [x] Process ID takibi

### Medya Yönetimi
- [x] Medya yükleme sistemi
- [x] Medya klasör tarama
- [x] Ödeme durumu takibi
- [x] Müşteri indirme sayfası
- [x] ZIP indirme özelliği

### Medya POS & Seller Paneli (2026-02-22)
- [x] /admin/media/pos — yeni Foto/Video satış paneli
- [x] Canlı istatistik header (aktif uçuş, tamamlanan, ödeme, bekleyen)
- [x] Aktif uçuş listesi (tıklanabilir)
- [x] QR tarama: Html5Qrcode (kamera açan, çalışıyor)
- [x] Silver €100 / Gold €120 / Platinum €150 paketler
- [x] Foto+Video €70 / Sadece Foto €45 / Sadece Video €50 ürünler
- [x] Split payment (5 döviz, 3 yöntem)
- [x] Medya Durumu: Klasörü Aç (turuncu), Webden Yükle (mavi, gerçek upload)
- [x] Sidebar: mavi kutu aç/kapa ok, "Foto/Video Satış" menüsü
- [x] Header: renkli döviz kurları (€ kırmızı, $ yeşil, £ mavi, ₽ turuncu) + güncelle butonu

### Önizleme İstasyonu & UI Düzeltmeleri (2026-02-23)
- [x] /admin/media/seller yeniden yazıldı — sadece pilot listesi ve klasör açma (satış kaldırıldı)
- [x] Pilot kartları: ad, uçuş sayısı, dosya/satılan/bekleyen istatistikleri
- [x] 3 özet kart: Aktif Pilot, Toplam Dosya, Bekleyen/Satılan
- [x] Header döviz kurları: her dövizin TL karşılığı (cross-rate hesaplama)
- [x] Sidebar isActive düzeltmesi (alt menüler üst menüyü aktif göstermez)
- [x] Personel yetkileri menuStructure sidebar ile eşleştirildi (eksik menüler eklendi)

### Foto & Video Takip Paneli (2026-02-19)
- [x] Dashboard istatistik kartları (6 kart, değişim yüzdeleri)
- [x] Günlük gelir bar chart (Recharts, son 30 gün)
- [x] Alan vs almayan pie chart (yeşil/sarı)
- [x] Müşteri foto/video tablosu (9 sütun, filtreler, pagination)
- [x] Satış personeli özet tablosu
- [x] Pilot bazlı medya özet tablosu (klasör açma)
- [x] Müşteri detay modalı (uçuş, satış, medya bilgileri)
- [x] Kasa raporu modalı (para birimi dağılımı, yeşil buton)
- [x] Teslim durumu toggle (DELIVERED/READY)
- [x] 6 API endpoint (dashboard, chart, cashbox, sales, staff-summary, pilot-summary)
- [x] Recursive medya dosya tarama (GoPro alt klasörleri dahil)
- [x] Pilot klasör açma hata toleransı (klasör yoksa oluştur)

### LAN İndirme Sistemi v4 — HTTPS + Otomatik Redirect (2026-02-20)
- [x] LAN Download sunucusu HTTP → HTTPS (self-signed sertifika, port 3080)
- [x] Chrome mixed content engeli çözüldü (HTTPS→HTTPS)
- [x] WiFi'deyse otomatik `window.location.href` ile indirme linkine yönlendirme
- [x] İnternetteyse müşteri kartı sayfası gösterilir, butonla indirir
- [x] Server-side LAN algılama (IP karşılaştırma) aynen duruyor
- [x] `/api/network/discover` → `lanBaseUrl: https://IP:3080`

### POS / Satış
- [x] Ürün yönetimi
- [x] Satış işlemleri
- [x] Ödeme yöntemleri (Nakit, Kart, Havale, Veresiye)
- [x] Müşteri bazlı satış geçmişi (para birimi + ödeme yöntemi detaylı gösterim)
- [x] Borç tahsilat sistemi
- [x] Personel satış takip sistemi (soldBy kaydı)
- [x] Ödenmemiş satışlar sayfası - personel/saat bilgisi (/admin/sales/unpaid)
- [x] Ödenmemiş satışlarda sadece "Ödeme Al" butonu (nakit/kart butonları kaldırıldı)
- [x] Rest kategorisi (acentadan gelen müşteri kalan ödeme bakiyesi)
- [x] Rest serbest tutar girişi (sabit fiyat yok, POS'ta modal ile tutar girilir)
- [x] Kullanıcı bazlı POS kategori yetkileri (Admin → Kasiyer Yetkileri sekmesi)
- [x] POS'ta rol/kullanıcı bazlı kategori filtreleme

### Multi-Currency (Döviz) Sistemi (2026-02-14)
- [x] TCMB XML API entegrasyonu (kur çekme, cross-rate hesaplama)
- [x] Fallback zinciri (TCMB → Frankfurter API → .env sabit kurlar)
- [x] In-memory cache + 15dk otomatik güncelleme (cron job)
- [x] ExchangeRate, ExchangeRateHistory, PaymentDetail DB modelleri
- [x] Currency API endpoints (/api/currency/rates, /convert, /history)
- [x] 5 para birimi desteği (EUR, USD, GBP, RUB, TRY)
- [x] EUR bazlı fiyatlandırma (ürünler EUR'da tutulur)
- [x] Split payment (bölünmüş ödeme — max 5 satır)
- [x] Para birimi-ödeme yöntemi kısıtlamaları (GBP/RUB sadece nakit)
- [x] POS sayfası — compact buton tabanlı ödeme UI + kur barı + kur hesaplama aracı
- [x] Müşteri detay — medya ödeme, POS modal, borç tahsilat döviz desteği
- [x] Reusable renderPaymentLinesUI component
- [x] Canlı kur göstergesi (sidebar)
- [x] Seed data EUR fiyatlara çevrildi
- [x] Cross-rate hesaplama hatası düzeltildi (EUR_TRY / X_TRY formülü)
- [x] Ürün fiyatları makul EUR değerlerine güncellendi
- [x] "Medya" kategorisi → "Foto/Video" olarak tüm sistemde değiştirildi

### Raporlama (2026-02-12)
- [x] Dashboard - Ana panel özet kartları
- [x] Kasa Raporu (/admin/sales/daily) - Günlük satış detayları + personel/saat
- [x] Vezne Raporu (/admin/reports/cashier) - Tüm personel performansı
- [x] Personel Detay Raporu (/admin/reports/staff-sales) - Bireysel satış analizi
- [x] Gelir Raporu (/admin/reports/revenue) - Kategori, trend, personel performansı
- [x] Pilot Raporu (/admin/reports/pilots) - Pilot performans istatistikleri
- [x] Müşteri Akışı Raporu (/admin/reports/customers) - Müşteri analizi
- [x] Dönem Karşılaştırma (/admin/reports/compare) - İki dönem karşılaştırması
- [x] Sistem İzleme (/admin/reports/system) - Disk, DB, memory kullanımı
- [x] Bekleyen Ödemeler Modal - Personel detayında pop-up panel
- [x] Foto/Video geliri tüm raporlarda doğru hesaplanıyor (MEDIA→Foto/Video normalize)
- [x] Kategori dağılımında eski MEDIA kayıtları Foto/Video olarak gösteriliyor

### iOS Native App (2026-02-16)
- [x] Capacitor iOS projesi sıfırdan oluşturuldu (npx cap add ios)
- [x] Firebase iOS SDK entegrasyonu (Package.swift — FirebaseCore + FirebaseMessaging)
- [x] AppDelegate.swift — FCM push notification desteği (APNs token, foreground banner)
- [x] GoogleService-Info.plist kopyalandı
- [x] 1024x1024 universal app icon (Xcode 15+ tek dosya modu)
- [x] Info.plist — UIBackgroundModes (remote-notification, fetch), UIDeviceFamily (1+2), FirebaseMessagingAutoInitEnabled
- [x] App.entitlements — aps-environment (development)
- [x] capacitor.config.ts — ios ayarları (contentInset, backgroundColor, iosScheme)
- [x] LaunchScreen.storyboard — mavi arka plan (#2563eb)
- [x] fix-ios-firebase.js — cap sync sonrası Firebase koruması
- [x] iPhone + iPad desteği (UIDeviceFamily 1,2)
- [ ] Xcode'da Signing & Capabilities yapılandırması (manuel)
- [ ] Push Notifications capability ekleme (manuel)
- [ ] Cihaza yükleme ve test (manuel)
- [ ] IPA çıkarma — Ad Hoc dağıtım (manuel)

### UI/UX
- [x] Responsive sidebar (collapse özelliği)
- [x] Mobil menü (hamburger)
- [x] Mobil scroll düzeltmesi
- [x] Menü tıklandığında kapanma
- [x] Slide-in animasyonları (Tailwind keyframes)
- [x] Kategori accordion pattern (genişletilebilir satış listesi)
- [x] Modal sistemleri (bekleyen ödemeler, POS, vb.)
- [x] Progress bar gösterimleri (personel katkı, ödeme dağılımı)
- [x] Tıklanabilir linkler arası navigasyon (personel ↔ detay, müşteri ↔ portfolyo)

## Devam Eden / Eksik Özellikler

### Raporlar
- [ ] Pilot performans raporu detaylandırma
- [ ] Müşteri akışı raporu geliştirme
- [ ] Excel export özelliği
- [ ] Tarih aralığı preset'leri (bugün, bu hafta, bu ay, vb.)

## Bilinen Sorunlar

1. **PDF Türkçe font** - pdfkit varsayılan fontları Türkçe desteklemiyor, ASCII'ye dönüştürülüyor

## Deployment Notları

- Proje Cloudflare Tunnel ile internete açıldı
- Custom domain: skytrackyp.com
- API subdomain: api.skytrackyp.com
- Tunnel config: ~/.cloudflared/config.yml

### Hızlı Başlatma (2025-02-10)

**Tek Komut:**
```bash
./scripts/start-all.sh
```

**Durdurma:**
```bash
./scripts/stop-all.sh
```

**Detaylı Rehber:**
- `memory-bank/quickstart.md` dosyasını oku
- Tüm başlatma komutları ve sorun giderme adımları içerir

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
- [ ] iOS uygulama build (ileride)
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

### POS / Satış
- [x] Ürün yönetimi
- [x] Satış işlemleri
- [x] Ödeme yöntemleri (Nakit, Kart, Havale, Veresiye)
- [x] Müşteri bazlı satış geçmişi
- [x] Borç tahsilat sistemi
- [x] Personel satış takip sistemi (soldBy kaydı)
- [x] Ödenmemiş satışlar sayfası - personel/saat bilgisi (/admin/sales/unpaid)

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

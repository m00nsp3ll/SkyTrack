# Progress - SkyTrack Project

## Tamamlanan Özellikler

### Çekirdek Sistem
- [x] Next.js 14 + Express.js + PostgreSQL + Prisma kurulumu
- [x] JWT tabanlı kimlik doğrulama sistemi (7 gün geçerli token)
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
- [x] Kullanıcı rolleri (ADMIN, OFFICE_STAFF, PILOT, MEDIA_STAFF)
- [x] Personel CRUD işlemleri
- [x] Pilot-kullanıcı eşleştirme

### PWA ve Push Bildirimler
- [x] Web Push Notification altyapısı (web-push + VAPID)
- [x] PushSubscription veritabanı modeli
- [x] Push notification servisi (sendPushToUser, sendPushToPilot, sendPushBroadcast)
- [x] Push API endpoint'leri (subscribe, unsubscribe, test, broadcast)
- [x] Service Worker push handler
- [x] PWA manifest ve next-pwa yapılandırması
- [x] Bildirim izin modal'ı (PushNotificationManager)
- [x] PWA kurulum rehberi (iOS talimatları dahil)
- [x] Müşteri atamalarında push bildirimi
- [x] Admin bildirim yönetim sayfası
- [x] Custom domain desteği (api.skytrackyp.com)

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

### UI/UX
- [x] Responsive sidebar (collapse özelliği)
- [x] Mobil menü (hamburger)
- [x] Mobil scroll düzeltmesi
- [x] Menü tıklandığında kapanma
- [x] Slide-in animasyonları (Tailwind keyframes)

## Devam Eden / Eksik Özellikler

### Raporlar
- [ ] Pilot performans raporu
- [ ] Gelir raporu
- [ ] Müşteri akışı raporu
- [ ] Dönem karşılaştırma

## Bilinen Sorunlar

1. **PDF Türkçe font** - pdfkit varsayılan fontları Türkçe desteklemiyor, ASCII'ye dönüştürülüyor

## Deployment Notları

- Proje Cloudflare Tunnel ile internete açıldı
- Custom domain: skytrackyp.com
- API subdomain: api.skytrackyp.com
- Tunnel config: ~/.cloudflared/config.yml
- Tunnel başlatma: `cloudflared tunnel run skytrack`

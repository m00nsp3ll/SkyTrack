# Progress - SkyTrack Project

## Tamamlanan Özellikler

### Çekirdek Sistem
- [x] Next.js 14 + Express.js + PostgreSQL + Prisma kurulumu
- [x] JWT tabanlı kimlik doğrulama sistemi
- [x] Socket.IO gerçek zamanlı iletişim
- [x] HTTPS desteği (self-signed certificate)
- [x] Dinamik IP algılama (LAN için)

### Müşteri Yönetimi
- [x] Müşteri kayıt formu (ad, soyad, telefon, kilo, acil iletişim)
- [x] Dijital imza özelliği (react-signature-canvas)
- [x] Risk formu PDF oluşturma (pdfkit)
- [x] QR kod oluşturma ve yazdırma
- [x] Müşteri detay sayfası
- [x] Müşteri listesi (arama, filtreleme, pagination)

### Pilot Yönetimi
- [x] Pilot CRUD işlemleri
- [x] Pilot durumları (Müsait, Uçuşta, Molada, Mesai Dışı)
- [x] Otomatik pilot atama (en az uçuş yapana öncelik)
- [x] Günlük uçuş limiti (max 7)
- [x] Pilot sırası yönetimi (drag & drop)
- [x] Pilot detay sayfası (toplam uçuş, tarih filtresi)
- [x] Pilot panel (mobil için)

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
- [x] Dinamik IP ile QR URL oluşturma

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

### UI/UX
- [x] Responsive sidebar (collapse özelliği)
- [x] Mobil menü (hamburger)
- [x] Mobil scroll düzeltmesi
- [x] Menü tıklandığında kapanma

## Devam Eden / Eksik Özellikler

### Medya Yönetimi
- [ ] Medya yükleme sistemi (GoPro'dan)
- [ ] Thumbnail oluşturma
- [ ] Medya satış paneli
- [ ] Müşteri indirme sayfası
- [ ] Ödeme durumu takibi

### POS / Satış
- [ ] Ürün yönetimi
- [ ] Satış işlemleri
- [ ] Ödeme yöntemleri
- [ ] Günlük rapor

### Raporlar
- [ ] Pilot performans raporu
- [ ] Gelir raporu
- [ ] Müşteri akışı raporu
- [ ] Dönem karşılaştırma

## Bilinen Sorunlar

1. **Medya Yönetimi boş** - MediaFolder kaydı yok çünkü henüz medya yüklenmedi
2. **PDF Türkçe font** - pdfkit varsayılan fontları Türkçe desteklemiyor, ASCII'ye dönüştürülüyor

## Deployment Notları

- Proje yerel ağ (LAN) için tasarlandı
- Uzak sunucuya deploy edilirse medya transfer sistemi çalışmaz
- Önerilen: Yerel mini PC/NAS + bulut yedekleme

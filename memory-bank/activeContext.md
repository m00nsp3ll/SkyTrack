# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-18 / 2026-04-19

### ✅ QR Etiket Yazdırma Sistemi (Xprinter XP-490B)
- Etiket boyutu: 7cm x 5cm (70mm x 50mm)
- Çalışan format: portrait, yazı üstte (tarih→kod-isim→pilot), QR altta
- Müşteri sayfası: inline HTML template (labelPrint.ts webpack bundle sorunu nedeniyle)
- Print dialog ayarları: Custom paper size 50x70mm, Scale %60
- `@page size` CSS tarayıcıda sorun çıkarıyor — kaldırıldı, basit HTML kullanılıyor
- AirPrint Bridge: dns-sd ile Mac üzerinden iPad'lere Xprinter paylaşımı
- Kiosk (iPad): AirPrint native bridge (WKScriptMessageHandler) ile yazdırma
- **Yazıcı değişecek**: Brother QL-810W (AirPrint native destekli, 62mm etiket)

### ✅ Pilot Sıra Sistemi Düzeltmeleri
- Mesai dışı→içi geçişte otomatik feragat kaldırıldı — pilot aynı konumuna döner
- Mesai dışı pilotlar sırada kalır, müşteri geldiğinde otomatik feragat alır
- Pilot panelinde serbest feragat butonu kaldırıldı
- Müşteri atandığında (ASSIGNED) feragat butonu eklendi
- Pilot paneli sıra listesinde tüm pilotlar görünür (mesai dışı soluk badge'li)
- Sıra numarası tüm inQueue pilotları sayar (OFF_DUTY dahil)
- Yeni pilot ekleme: roundCount ve forfeitCount en yüksek tura eşitlenir

### ✅ Firma Raporu Eklendi
- `/admin/reports/company` — firma bazlı uçuş/ödeme istatistikleri
- Her firma: pilot sayısı, toplam uçuş, hakediş, ödenen, kalan
- Firma açılınca pilot detay tablosu + gerçek uçuş detayları
- Sidebar'da Pilot Raporu altına menü eklendi

### ✅ Pilot Raporu Güncellemeleri
- Mevcut Tur: en yüksek roundCount gösteriliyor (queueState yerine)
- Yazdır butonu eklendi — tabloyu temiz popup'ta yazdırır
- Pilot listesine "Mesai Disi" filtresi eklendi (Pasif yerine)

### ✅ Gerçek Müşteri Uçuşları Entegrasyonu
- 74 gerçek müşteri (T0001-T0074) → flight kaydı oluşturuldu (doğru pilotlarla)
- 74 Excel-import flight silindi — toplam sayılar korundu
- Müşteri listesinde pilot adları görünür

### ✅ Emre Elkap Ödeme Düzeltmesi
- Kalan bakiye negatif gösterebiliyor (avans durumu: 2K hak ediş, 4K ödenmiş = -2K)
- `Math.max(0, ...)` kaldırıldı — negatif bakiye gösteriliyor

### 🔐 Kimlik Bilgileri
```
Admin:  admin / Aa19866891!
Kiosk:  Kiosk / Kiosk
VDS SSH: root@166.1.91.9 / 22a5c8d1113a!diyo@
```

---

## Bilinen Sorunlar / TODO
- [ ] Etiket yazıcı: Brother QL-810W alınacak, AirPrint native destekli
- [ ] Etiket yazıcı: her baskıda 1 boş etiket fazla çıkıyor (PostAction ayarı)
- [ ] Kiosk yazdırma: iPad AirPrint ile tek sayfa/ortalama sorunları (yeni yazıcıyla çözülecek)
- [ ] Admin için ayrı iOS build planı (com.skytrackyp.admin bundle)
- [ ] Pilot ödeme yetkisi ADMIN → SUPER_ADMIN kısıtlaması (Tolga08 only)

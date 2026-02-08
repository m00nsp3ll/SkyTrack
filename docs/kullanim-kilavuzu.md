# SkyTrack Kullanım Kılavuzu

## İçindekiler
1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [İlk Kurulum](#ilk-kurulum)
3. [Giriş Yapma](#giriş-yapma)
4. [Admin Paneli](#admin-paneli)
5. [Müşteri Kayıt İşlemi](#müşteri-kayıt-işlemi)
6. [Pilot Paneli](#pilot-paneli)
7. [Medya Yönetimi](#medya-yönetimi)
8. [POS Satış](#pos-satış)
9. [Raporlar](#raporlar)
10. [Sık Sorulan Sorular](#sık-sorulan-sorular)
11. [Sorun Giderme](#sorun-giderme)

---

## Sistem Gereksinimleri

### Sunucu
- Ubuntu 20.04+ veya Debian 11+
- Minimum 4GB RAM, önerilen 8GB
- 100GB+ SSD (medya dosyaları için)
- Sabit yerel IP adresi (örn: 192.168.1.100)

### İstemciler
- Modern web tarayıcısı (Chrome, Safari, Firefox, Edge)
- Aynı WiFi ağına bağlı olmalı

### Yazılım
- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+
- Nginx
- FFmpeg (video thumbnail için)

---

## İlk Kurulum

### Otomatik Kurulum
```bash
cd /path/to/skytrack
sudo ./scripts/setup.sh
```

### Manuel Kurulum
1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Veritabanını hazırlayın:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

3. Sunucuları başlatın:
```bash
npm run dev  # Geliştirme
# veya
pm2 start ecosystem.config.js  # Üretim
```

---

## Giriş Yapma

### Varsayılan Kullanıcılar

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| Admin | admin | admin123 |
| Pilot | ahmet | pilot123 |
| Pilot | mehmet | pilot123 |
| Pilot | ali | pilot123 |

⚠️ **Önemli:** Üretim ortamında tüm şifreleri değiştirin!

### Giriş Adımları
1. Tarayıcıda `http://192.168.1.100` adresine gidin
2. Kullanıcı adı ve şifrenizi girin
3. "Giriş Yap" butonuna tıklayın

---

## Admin Paneli

Ana sayfa (`/admin`) şu bilgileri gösterir:
- Bugünkü müşteri sayısı
- Aktif/tamamlanan uçuş sayısı
- Havadaki müşteriler
- Günlük gelir (medya + POS)
- Ödenmemiş tutarlar
- Saatlik dağılım grafikleri

### Hızlı Erişim Butonları
- **Yeni Müşteri:** Müşteri kayıt formu
- **Canlı Uçuşlar:** Aktif uçuş takibi
- **POS Satış:** Satış ekranı
- **Medya Satış:** Fotoğraf/video satışı
- **Pilot Sırası:** Pilot kuyruk yönetimi
- **Kasa Raporu:** Günlük kasa özeti

---

## Müşteri Kayıt İşlemi

### 1. Yeni Müşteri Kaydı
1. Sol menüden "Yeni Kayıt" seçin
2. Müşteri bilgilerini girin:
   - Ad, soyad (zorunlu)
   - Telefon numarası
   - Ağırlık (kg)
   - Uçuş türü
3. "Kaydet" butonuna tıklayın

### 2. QR Kod Oluşturma
- Kayıt sonrası otomatik olarak QR kod oluşturulur
- QR kodu yazdırın ve müşteriye verin
- QR kod format: `ST-20260207-001`

### 3. Pilot Ataması
- Sistem otomatik olarak en uygun pilotu atar
- En az uçuş yapan pilot önceliklidir
- Günlük limit dolmuş pilotlar atanmaz

### 4. QR Kod Tarama
1. "QR Tara" sayfasına gidin
2. Kamerayı QR koda tutun
3. Müşteri bilgileri görüntülenir

---

## Pilot Paneli

Pilotlar telefonlarından `/pilot` adresine girerek kendi panellerine erişir.

### Pilot Panel Özellikleri
- Atanan müşteri bilgisi
- Uçuş durumu güncelleme
- Günlük uçuş sayacı
- Medya klasörü tarama

### Uçuş Durumu Akışı
1. **Bekliyor** → Müşteri atandı
2. **Alındı** → "Müşteriyi Aldım" butonuna tıklayın
3. **Uçuşta** → "Kalkış Yaptım" butonuna tıklayın
4. **Tamamlandı** → "İniş Yaptım" butonuna tıklayın

### PWA Kurulumu (Ana Ekrana Ekleme)
1. Chrome'da pilot panelini açın
2. "Ana Ekrana Ekle" banner'ına tıklayın
3. Artık uygulama gibi açılır

---

## Medya Yönetimi

### Dosya Yükleme Yöntemleri

#### Yöntem 1: Web Üzerinden
1. Admin → Medya Yönetimi
2. Müşteriyi seçin
3. "Dosya Yükle" butonuna tıklayın
4. Fotoğraf/videoları seçin

#### Yöntem 2: Klasör Tarama
1. Dosyaları sunucudaki `/media/{tarih}/{pilot_id}/{müşteri_id}/` klasörüne kopyalayın
2. Admin → Medya Yönetimi → "Tara" butonuna tıklayın
3. Thumbnail'lar otomatik oluşturulur

### Medya Satış Paneli
1. Admin → Medya Satış
2. Müşteri QR kodunu tarayın veya ID girin
3. Dosyaları önizleyin
4. Fiyat girin ve ödeme yöntemini seçin
5. "Satışı Tamamla" butonuna tıklayın

### Müşteri İndirme
- Ödeme sonrası müşteri QR kodunu tarayarak dosyalarını indirebilir
- `/c/{müşteri_id}` sayfasından erişim

---

## POS Satış

### Satış Ekranı (`/pos`)
Ekran 3 sütuna ayrılmıştır:

#### Sol: Müşteri Seçimi
- QR kod tarayın veya
- Müşteri ID girin veya
- "Misafir Satış" için boş bırakın

#### Orta: Ürün Seçimi
- Kategorilere göre filtreleyin
- Favoriler sekmesi hızlı erişim sağlar
- Ürüne tıklayarak sepete ekleyin

#### Sağ: Sepet ve Ödeme
- Miktar artır/azalt
- Ödeme yöntemi seç: Nakit, Kart, Havale, Veresiye
- "Satışı Tamamla"

### Ürün Yönetimi
Admin → Ürün Kataloğu
- Yeni ürün ekle
- Fiyat güncelle (inline)
- Stok takibi
- Favori/aktif toggle

### Ödenmemiş Satışlar
Admin → Ödenmemişler
- Müşteri bazında gruplu liste
- Toplu ödeme alma
- Veresiye takibi

---

## Raporlar

### Ana Dashboard (`/admin`)
- Anlık özet kartları
- Saatlik dağılım grafikleri
- Son kayıtlar, uçuşlar, satışlar

### Pilot Performans Raporu
- Pilot bazında uçuş sayıları
- Ortalama uçuş süreleri
- Adillik metrikleri (denge skoru)
- Tarih aralığı filtresi

### Gelir Raporu
- Toplam gelir (medya + POS)
- Günlük trend grafikleri
- Kategori dağılımı
- En çok satan ürünler

### Müşteri Akış Raporu
- Günlük/saatlik yoğunluk
- Ortalama bekleme süresi
- İptal oranı
- Durum dağılımı

### Günlük Operasyon Raporu
- Kasa özeti (nakit, kart, havale)
- Pilot performansı
- Medya özeti
- Yazdırmaya hazır format

### Sistem İzleme (Admin)
- Disk kullanımı
- Veritabanı boyutu
- Bellek durumu
- Kayıt sayıları

---

## Sık Sorulan Sorular

### QR kod okunamıyor?
- Kameranın odaklandığından emin olun
- Işıklandırmayı iyileştirin
- Manuel ID girişi kullanın

### Pilot atanamıyor?
- Tüm pilotların günlük limiti dolmuş olabilir
- Admin → Pilotlar'dan durumları kontrol edin
- Gerekirse limiti artırın

### Medya dosyaları görünmüyor?
- "Tara" butonuna tıklayarak klasörü yeniden tarayın
- Dosya formatlarını kontrol edin (JPG, MP4 desteklenir)
- Thumbnail oluşturma için FFmpeg kurulu olmalı

### Sistem yavaş çalışıyor?
- Redis bağlantısını kontrol edin: `redis-cli ping`
- PM2 ile servisleri yeniden başlatın: `pm2 restart all`
- Logları kontrol edin: `pm2 logs`

---

## Sorun Giderme

### Servis Durumu Kontrolü
```bash
pm2 status
```

### Logları Görüntüleme
```bash
pm2 logs skytrack-api
pm2 logs skytrack-web
```

### Veritabanı Bağlantısı
```bash
psql -U skytrack -d skytrack -c "SELECT 1"
```

### Redis Bağlantısı
```bash
redis-cli ping
```

### Nginx Durumu
```bash
sudo systemctl status nginx
sudo nginx -t  # Yapılandırma testi
```

### Yeniden Başlatma
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Yedekleme
```bash
./scripts/backup.sh
```

### Geri Yükleme
```bash
./scripts/restore.sh 2026-02-07_03-00-00
```

---

## Destek

Teknik destek için:
- GitHub Issues: https://github.com/m00nsp3ll/SkyTrack/issues
- E-posta: [destek e-postası]

---

*Bu kılavuz SkyTrack v1.0 için hazırlanmıştır.*
*Son güncelleme: Şubat 2026*

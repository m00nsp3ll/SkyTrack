# 🚀 SkyTrack — Claude Code ile Başlangıç Rehberi

## Memory Bank Dosyaları Nedir?

Memory Bank sistemi, Claude Code'un projenin tüm bağlamını anlamasını sağlar. Claude Code her seferinde sıfırdan başladığı için, bu dosyalar "hafıza" görevi görür.

## Dosya Listesi

| Dosya | İçerik | Ne Zaman Güncellenir |
|-------|--------|---------------------|
| `CLAUDE.md` | Ana talimat dosyası (Claude Code bunu otomatik okur) | Nadiren |
| `projectbrief.md` | Proje özeti ve hedefler | Proje başında |
| `productContext.md` | Kullanıcı akışları, veri yapıları, gereksinimler | Yeni özellik eklendiğinde |
| `techArchitecture.md` | Tech stack, veritabanı şeması, API tasarımı | Mimari karar alındığında |
| `systemPatterns.md` | Proje yapısı, kodlama kuralları | Pattern değiştiğinde |
| `progress.md` | İlerleme takibi, yapılan/yapılacak işler | Her iş tamamlandığında |
| `activeContext.md` | Şu an üzerinde çalışılan şey | Her oturumda |

## Nasıl Kullanılır

### Adım 1: Proje Klasörünü Oluştur
```bash
mkdir skytrack
cd skytrack
```

### Adım 2: Memory Bank Dosyalarını Kopyala
```bash
# Bu indirdiğin memory-bank klasörünü projenin içine koy
cp -r memory-bank/ skytrack/
# CLAUDE.md'yi proje kök dizinine taşı
cp memory-bank/CLAUDE.md skytrack/CLAUDE.md
```

### Adım 3: Claude Code'u Başlat
```bash
cd skytrack
claude
```

### Adım 4: İlk Komutu Ver
```
Projeyi başlatalım. CLAUDE.md ve memory-bank/ klasöründeki tüm dosyaları oku,
sonra Phase 1'i (Foundation) oluşturmaya başla:
1. Monorepo yapısını kur (package.json workspaces)
2. Next.js frontend'i oluştur
3. Express.js backend'i oluştur  
4. Prisma schema'yı ekle ve PostgreSQL'e migration yap
5. JWT authentication sistemini kur
6. Temel layout ve navigasyonu oluştur (Türkçe UI)
```

### Adım 5: Sonraki Fazlar İçin
Her yeni oturumda Claude Code'a şunu de:

```
memory-bank/ klasöründeki dosyaları oku ve progress.md'deki
mevcut duruma göre bir sonraki adımı uygula.
```

## Faz Bazında Claude Code Komutları

### Phase 2: Müşteri Kayıt & QR Sistemi
```
Phase 2'ye geçiyoruz. memory-bank dosyalarını oku.
Müşteri kayıt formunu oluştur:
- Ad, soyad, email, telefon, acil iletişim, kilo alanları
- Dijital risk formu (checkbox ile onay)
- Kayıt tamamlandığında otomatik ID oluştur (ST-YYYYMMDD-NNN)
- QR kod üret (yerel ağ URL'si encode edilmiş)
- Sıradaki müsait pilota otomatik ata
- QR kodu yazdırılabilir formatta göster
```

### Phase 3: Pilot Sistemi
```
Phase 3'e geçiyoruz. memory-bank dosyalarını oku.
Pilot yönetim sistemini oluştur:
- Pilot CRUD (ekleme, düzenleme, silme)
- Pilot sıra/rotasyon algoritması (round-robin, günde max 7 uçuş)
- Pilot mobil paneli (responsive):
  - Atanmış müşteri listesi
  - "Müşteriyi Aldım" / "Uçuştayım" / "Uçuş Bitti" butonları
- Socket.IO ile gerçek zamanlı bildirimler
- Gece yarısı otomatik uçuş sayacı sıfırlama (cron)
```

### Phase 4: Uçuş Takibi
```
Phase 4'e geçiyoruz. memory-bank dosyalarını oku.
Uçuş takip sistemini oluştur:
- Uçuş yaşam döngüsü yönetimi (atandı → alındı → uçuşta → tamamlandı)
- Admin için canlı uçuş dashboard'u
- Uçuş geçmişi ve süre takibi
- Uçuş tamamlandığında otomatik medya klasörü oluşturma
```

### Phase 5: Medya Yönetimi
```
Phase 5'e geçiyoruz. memory-bank dosyalarını oku.
Medya (fotoğraf/video) sistemini oluştur:
- Dosya yükleme (fotoğraf: jpg/png, video: mp4/mov, max 100MB)
- Otomatik thumbnail üretimi
- Klasör yapısı: /media/{tarih}/{pilot}/{müşteri}/
- Medya satıcı paneli (QR oku → dosyaları gör → ödeme kaydet)
- Ödeme durumu takibi
- Müşteri için LAN üzerinden indirme sayfası
- Android ve iPhone uyumlu mobil indirme UI'ı
- QR kod okutunca dosyalara erişim (ödeme yapılmışsa)
```

### Phase 6: Satış Noktası (POS)
```
Phase 6'ya geçiyoruz. memory-bank dosyalarını oku.
POS (Point of Sale) sistemini oluştur:
- Ürün kataloğu yönetimi (kola, su, hediyelik eşya vs.)
- QR okut → müşteri sekmesine ürün ekle
- Ödeme kaydı (nakit / kredi kartı / havale)
- Müşteri satın alma geçmişi
- Fotoğraf/video satışı ile entegre çalışacak
```

### Phase 7: Raporlar
```
Phase 7'ye geçiyoruz. memory-bank dosyalarını oku.
Raporlama sistemini oluştur:
- Günlük operasyon dashboard'u (toplam uçuş, müşteri, gelir)
- Pilot performans istatistikleri
- Gelir raporları (medya satışı + POS ayrı ayrı)
- Müşteri akış analitiği
- Excel/PDF export
```

## 💡 Önemli İpuçları

1. **Her oturumda** Claude Code'a `memory-bank/` dosyalarını okumasını söyle
2. **Bir faz bittikten sonra** `progress.md` dosyasını güncelle
3. **Yeni karar aldıysan** `techArchitecture.md` veya `systemPatterns.md`'yi güncelle
4. **Hata bulursan** `progress.md`'deki "Known Issues" bölümüne ekle
5. **CLAUDE.md** dosyasını projenin kök dizininde tut — Claude Code bunu otomatik okur

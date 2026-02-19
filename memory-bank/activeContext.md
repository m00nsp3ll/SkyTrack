# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-20 (Oturum 14)

### Yapılan İşler

1. **Foto/Video Raporu UI İyileştirmeleri** ✅
   - Kasa raporu 3-sütun layout'tan modal'a taşındı (yeşil buton ile açılır)
   - Grafikler 2-sütun layout (3/5 bar chart + 2/5 pie chart, h-72)
   - Pie chart renkleri: Alan=yeşil (#22c55e), Almayan=sarı (#f59e0b)
   - Kasa Raporu butonu sayfa başlığının yanına taşındı (yeşil renk)

2. **Header'da Tüm Kurlar** ✅
   - Sidebar'daki kur bölümü kaldırıldı
   - Header'a tüm kurlar eklendi: ₺ (TRY), $ (USD), £ (GBP), ₽ (RUB)
   - Kompakt pill badge'ler, 60 sn otomatik güncelleme
   - `getAllRates()` API'den tüm kurlar çekiliyor

3. **Medya Klasör Yapısı - Recursive Tarama** ✅
   - `listMediaFiles()` ve `scanAndProcessFolder()` recursive yapıldı
   - Yeni `collectMediaFilesRecursive()` helper fonksiyonu
   - GoPro klasörleri (100GOPRO, vb.) artık taranıyor
   - Alt klasörlerdeki tüm medya dosyaları sayılıyor ve listeleniyor

4. **Pilot Klasör Açma Hata Düzeltmesi** ✅
   - Klasör bulunamadığında hard error yerine otomatik oluşturma
   - Tarih klasörü varsa pilot klasörü yoksa → tarih klasörünü açar
   - Her iki klasör de yoksa → oluşturup açar

5. **Seed Data Güncelleme** ✅
   - 38 pilot, 42 kullanıcı, 17 ürün, 35 müşteri, 35 uçuş, 74 satış
   - Klasör yapısı: `media/DD-MM-YYYY/Pilot_Name/X.Sorti/DisplayId/`
   - Seed sorunsuz çalışıyor (`npm run db:seed`)

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/app/(dashboard)/admin/media/page.tsx` | Kasa raporu modal, 2-sütun grafikler, pie renkleri, yeşil buton |
| `packages/web/components/layout/Header.tsx` | Tüm kurlar (TRY, USD, GBP, RUB) pill badge'ler |
| `packages/web/components/layout/Sidebar.tsx` | Kur bölümü kaldırıldı |
| `packages/api/src/services/media.ts` | Recursive dosya tarama (collectMediaFilesRecursive) |
| `packages/api/src/routes/media.ts` | Pilot klasör açma hata düzeltmesi |
| `packages/api/prisma/seed.ts` | Güncel seed data |

### Sonraki Adımlar

- [ ] iOS bildirimde Türkçe karakter sorunu araştır
- [ ] Admin cron job bildirimleri
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

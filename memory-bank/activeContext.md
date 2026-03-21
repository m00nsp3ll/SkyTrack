# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-03-21 (Oturum 29)

### Yapılan İşler

1. **Sistem Düzeltmesi (Port Çakışması)** ✅
   - PostgreSQL port 5432 çakışması: Homebrew postgresql@16 Docker'ı engelliyordu
   - `start-all.sh` güncellendi: Homebrew PG otomatik durdurulur, eski process temizlenir
   - `docker-compose.yml`: postgres:16-alpine → postgres:14-alpine
   - `.env`: DATABASE_URL'den connection_limit parametreleri kaldırıldı
   - Tüm demo data (38 pilot, 17 ürün, kullanıcılar) git seed'den geri yüklendi

2. **Mobile Sidebar Safe Area Düzeltmesi** ✅
   - Android navigation bar üzerine binen "Çıkış Yap" butonu düzeltildi
   - `Sidebar.tsx`: paddingBottom: max(1.5rem, env(safe-area-inset-bottom))
   - `Header.tsx`: paddingTop: env(safe-area-inset-top)
   - `layout.tsx`: Mobile sidebar height: 100dvh + safe area padding

3. **"Beni Hatırla" Login Özelliği** ✅
   - Default seçili checkbox, 1 ay boyunca credentials localStorage'da saklar
   - `login/page.tsx`: savedCredentials key'i, checkbox UI eklendi

4. **Foto/Video Kasaya Yönlendirme Sistemi** ✅
   - Foto/Video satış elemanı ödeme alamaz, sadece "Kasaya Yönlendir" yapar
   - UNPAID satış oluşturulur, kasa ödemeyi kendi POS'undan alır
   - Çoklu para birimi kiosk UI: EUR/USD/GBP/RUB/TRY büyük renkli butonlar
   - Kasaya yönlendirme sonrası: download link + QR butonu gösterilir
   - `canCollectPayment`: sadece ADMIN ve OFFICE_STAFF tahsilat yapabilir

5. **Müşteri Download Sayfası 10 Dil Desteği** ✅
   - `/c/[displayId]` sayfası müşterinin kayıt dilinde gösterilir
   - AR ve FA için RTL layout desteği
   - Auto-download döngüsü kaldırıldı (sadece butonla indirme)
   - Teslim edildi otomatik: indirme tamamlandığında işaretlenir

6. **Risk Formu PDF Çok Dil** ✅
   - `waiverPdf.ts`: TR, EN, RU, DE, FR dillerinde PDF üretimi
   - ASCII transliteration (pdfkit Helvetica font uyumlu)
   - Diğer diller EN'e fallback yapar

7. **Kasa Raporu Para Birimi Düzeltmesi** ✅
   - Saatlik rapor timezone düzeltmesi: `process.env.TZ = 'Europe/Istanbul'`
   - Günlük rapor yeni güne doğru geçer (Türkiye saatine göre)
   - İşlem listesinde orijinal para birimi önce, EUR karşılığı alt satırda

8. **POS Para Birimi Kayıt Hatası Düzeltmesi** ✅
   - $100 USD → €86.67 kaydediliyor hatasını düzeltildi
   - `sales.ts` create: `productCurrency` artık `currency` parametresini kullanır (hardcoded EUR değil)
   - `unitPrice: priceNum` (orijinal para birimi miktarı, EUR'a çevrilmemiş)
   - UNPAID satışlar artık EUR'a zorlanmıyor
   - Bulk pay ve single pay: gerçek ödeme para birimimden EUR/TRY hesabı

9. **Kod Temizliği** ✅
   - `customers/[id]/page.tsx`: handleMarkDelivered, socket state, setPosFavorites, markingDelivered, getAvailableCurrencies kaldırıldı
   - Socket import'tan `Socket` type kaldırıldı

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `scripts/start-all.sh` | Homebrew PG durdurma, process temizleme eklendi |
| `docker-compose.yml` | postgres:16 → postgres:14 |
| `.env` | DATABASE_URL parametreleri temizlendi |
| `packages/web/app/(auth)/login/page.tsx` | Beni Hatırla checkbox (default checked) |
| `packages/web/components/layout/Sidebar.tsx` | Safe area inset bottom |
| `packages/web/components/layout/Header.tsx` | Safe area inset top |
| `packages/web/app/(dashboard)/layout.tsx` | Mobile sidebar 100dvh |
| `packages/web/app/(dashboard)/admin/customers/[id]/page.tsx` | Kasaya yönlendir, çoklu para birimi, kod temizliği |
| `packages/web/app/c/[displayId]/page.tsx` | 10 dil, RTL, auto-download kaldırıldı |
| `packages/web/app/(dashboard)/admin/sales/daily/page.tsx` | Orijinal para birimi gösterimi |
| `packages/web/app/(dashboard)/admin/sales/unpaid/page.tsx` | primaryCurrency gösterimi |
| `packages/api/src/routes/sales.ts` | Para birimi kayıt hatası düzeltmesi |
| `packages/api/src/routes/customers.ts` | language API'ye eklendi |
| `packages/api/src/services/waiverPdf.ts` | 5 dil PDF desteği |
| `packages/api/src/index.ts` | TZ = Europe/Istanbul |

### Sonraki Adımlar

- [ ] Raporlarda Rest kategorisi ayrı gösterilmeli
- [ ] iOS bildirimde Türkçe karakter sorunu
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği (pdfkit + custom font)

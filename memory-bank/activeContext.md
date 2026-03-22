# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-03-22 (Oturum 30)

### Yapılan İşler

1. **Medya Klasör Yolları Düzeltmesi** ✅
   - Eski UUID formatındaki klasör yolları (`media/pilot_<uuid>/customer_<uuid>`) doğru formata çevrildi
   - Doğru format: `media/DD-MM-YYYY/PilotName/X.Sorti/DisplayId`
   - `packages/api/scripts/fix-folder-paths.ts` scripti oluşturuldu ve çalıştırıldı (4 kayıt güncellendi)
   - `packages/api/scripts/create-media-folders.ts` scripti: fiziksel klasörler oluşturuldu

2. **Medya POS Sayfası Büyük Güncellemesi** ✅
   - "HAVADAKI MÜŞTERİLER" aktif uçuş barı kaldırıldı
   - Manuel para birimi butonları her zaman renkli (önceden seçili olmayan soluktu)
   - Boş ekran: kamera ikonu yerine SkyTrack logosu + büyük renkli QR Tara butonu
   - Çift QR tarayıcı hatası düzeltildi: `if (scannerRef.current) return` guard eklendi
   - Arama barı renklendirildi: beyaz arka plan, `border-blue-200`, mavi Ara butonu
   - Sağ panel 4 adımlı durum göstergesi: "Ödeme bekleniyor → Ödeme yapıldı → İndirmeye hazır → İndirildi"
   - QR kodu ödeme onaylandığında otomatik yükleniyor (`useEffect` ile `isPaid` tetiklenir)

3. **"Kasaya Yönlendir" Sistemi Düzeltmesi** ✅
   - UNPAID satış oluşturur (`POST /api/sales` → `paymentStatus: 'UNPAID'`)
   - `sentToCashier` state + `hasPendingMediaSale` API alanı ile UI güncelleniyor
   - `isSentToCashier = sentToCashier || hasPendingMediaSale` (sayfa yenilemede de devam eder)
   - Müşteri (`/c/[displayId]`) sayfasında "Ödeme Bekleniyor" ekranı gösterilir
   - Hata mesajı: `err.response?.data?.message || err.response?.data?.error?.message`

4. **Medya Dashboard (`/admin/media`) Güncellemeleri** ✅
   - Kasa raporu modal'dan inline karta taşındı (bar chart'ın yanında `lg:col-span-2`)
   - Default filtre: "Bugün" + yanında gün bazlı date picker
   - `selectedDate` state (today'e initialize) + `getDateParams` güncellendi
   - Teslim toggle (`handleDeliveryToggle`): `await` eklendi, hata alert'i düzeltildi
   - Pilot özeti ve müşteri tablosu boş görünme sorunu: date picker ile çözüldü

5. **Müşteri Download Sayfası (`/c/[displayId]`)** ✅
   - Uçak ikonu → SkyTrack logosu (w-20 h-20, rounded-2xl)
   - `hasPendingPayment` alanı eklendi (UNPAID satış varsa "Ödeme Bekleniyor" göster)
   - Render koşulu: `data.media && (data.media.fileCount > 0 || data.media.hasPendingPayment)`

6. **API Güncellemeleri** ✅
   - `GET /api/media/:customerId`: `hasPendingMediaSale` alanı eklendi
   - `GET /api/customers/public/:displayId`: `hasPendingPayment` alanı eklendi

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/app/(dashboard)/admin/media/pos/page.tsx` | Büyük güncelleme (aktif bar kaldırma, QR otomatik yükleme, 4 adım durum, renklendirme) |
| `packages/web/app/(dashboard)/admin/media/page.tsx` | Kasa raporu inline, date picker, delivery toggle düzeltmesi |
| `packages/web/app/c/[displayId]/page.tsx` | SkyTrack logosu, hasPendingPayment eklendi |
| `packages/api/src/routes/media.ts` | hasPendingMediaSale eklendi |
| `packages/api/src/routes/customers.ts` | hasPendingPayment eklendi (public endpoint) |
| `packages/api/scripts/fix-folder-paths.ts` | Oluşturuldu, tek seferlik çalıştırıldı |
| `packages/api/scripts/create-media-folders.ts` | Oluşturuldu, tek seferlik çalıştırıldı |

### Sonraki Adımlar

- [ ] Raporlarda Rest kategorisi ayrı gösterilmeli
- [ ] iOS bildirimde Türkçe karakter sorunu
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği (pdfkit + custom font)

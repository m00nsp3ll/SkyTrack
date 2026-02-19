# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-19 (Oturum 12)

### Yapılan İşler

1. **Foto/Video Geliri — Tüm Raporlarda Düzeltme** ✅
   - Kök neden: Medya satışları `itemType: 'MEDIA'` olarak kaydediliyordu, raporlar `'Foto/Video'` arıyordu
   - `mediaRevenue` hesaplaması: `mediaFolder.paymentAmount` (hep 0) yerine `sale` tablosundan hesaplanıyor
   - Tüm raporlarda (dashboard, kasa, gelir, vezne, operasyon) eski `MEDIA` → `Foto/Video` normalize edildi
   - `media.ts` payment endpoint'inde `paymentAmount` artık kaydediliyor

2. **Müşteri Satış Geçmişi — Para Birimi ve Ödeme Yöntemi** ✅
   - `customers.ts` API'sinde `paymentDetails: true` include eklendi
   - Frontend'de `PaymentDetail` interface eklendi
   - Satış geçmişi tablosunda her ödeme detayı ayrı gösteriliyor (para birimi + yöntem)

3. **Seed Data Güncelleme — Harun Personeli** ✅
   - Yeni kullanıcı: `harun / harun123` (OFFICE_STAFF)
   - 22 satış kaydı (8 POS, 3 USD, 3 TRY kart, 5 Foto/Video, 1 split, 2 veresiye)
   - Sunum için çeşitli para birimi ve ödeme yöntemi senaryoları

4. **Ödenmemiş Satışlar — Buton Temizliği** ✅
   - Dropdown'daki nakit/kart butonları kaldırıldı, sadece yeşil "Ödeme Al" butonu kalıyor

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/api/src/routes/reports.ts` | 6 yerde MEDIA→Foto/Video normalize, mediaRevenue sale tablosundan |
| `packages/api/src/routes/sales.ts` | mediaSales sale tablosundan, kategori normalize |
| `packages/api/src/routes/media.ts` | paymentAmount kaydı, itemType Foto/Video |
| `packages/api/src/routes/customers.ts` | paymentDetails include eklendi |
| `packages/web/.../customers/[id]/page.tsx` | PaymentDetail gösterimi, itemType Foto/Video |
| `packages/web/.../sales/unpaid/page.tsx` | Nakit/kart butonları kaldırıldı |
| `packages/api/prisma/seed.ts` | Harun personeli + 22 satış eklendi |
| `scripts/seed-demo.sh` | Harun giriş bilgisi eklendi |

### Önemli Teknik Notlar

- **Kategori Normalizasyon:** Tüm rapor endpoint'lerinde `s.itemType === 'MEDIA' ? 'Foto/Video' : s.itemType` kullanılıyor
- **Eski Kayıtlar:** DB'de hâlâ `MEDIA` olarak duranlar runtime'da normalize ediliyor
- **Yeni Kayıtlar:** `itemType: 'Foto/Video'` olarak kaydediliyor
- **Harun kullanıcısı:** `harun / harun123` — sunum için satış yapan ikinci personel

### Sonraki Adımlar

- [ ] iOS bildirimde Türkçe karakter sorunu araştır
- [ ] Admin cron job bildirimleri
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

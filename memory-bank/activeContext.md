# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-03-05 (Oturum 28)

### Yapılan İşler

1. **Risk Formu Güncellendi** ✅
   - Başlık: "Risk ve Sorumluluk Beyanı" → "Risk Kabul ve Sorumluluk Beyanı"
   - 6 madde → 8 madde (kooperatif adı, RAY SİGORTA, medya kaydı onayı, 18 yaş beyanı)
   - KVKK Aydınlatma Metni linki ve modalı eklendi (imza üstünde)
   - kvkkConsent + kvkkConsentAt DB alanları eklendi
   - signatureData @db.Text olarak güncellendi
   - İmza sonrası otomatik form submit (auto-submit)
   - Başarı ekranı sadeleştirildi (sadece QR Yazdır + Yeni Kayıt)
   - PDF tek sayfa sığdırma (font küçültme, spacing sıkıştırma)

2. **Çok Dilli Kayıt Sistemi** ✅
   - 10 dil desteği: TR, EN, RU, DE, AR, PL, UK, ZH, FR, FA
   - `lib/translations.ts` — 50+ çeviri anahtarı per dil
   - RTL desteği: Arapça ve Farsça (dir="rtl")
   - Dil seçim ekranı (SkyTrack origami logo + bayraklı butonlar)
   - Customer tablosuna `language` alanı eklendi

3. **Ülke İsimleri Dil Bazlı Çeviri** ✅
   - ALL_COUNTRIES dizisine ISO 3166-1 alpha-2 kodları eklendi
   - `Intl.DisplayNames` API ile seçilen dile göre otomatik ülke ismi çevirisi
   - Arama placeholder ve "sonuç bulunamadı" metni çevrildi
   - Dropdown dışına tıklayınca kapanma (click-outside handler)

4. **Logo Düzeltmesi** ✅
   - SkyTrack origami logosu (`SkyTrack-logo.png`) → `public/skytrack-logo.png`
   - Cache sorunu için farklı dosya adı kullanıldı

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/lib/translations.ts` | YENİ — 10 dilde çeviri sistemi + countrySearchPlaceholder, noResults |
| `packages/web/app/(dashboard)/admin/customers/new/page.tsx` | Çok dilli form, ISO ülke kodları, Intl.DisplayNames, click-outside |
| `packages/web/app/(dashboard)/admin/customers/[id]/page.tsx` | İmza gösterimi, risk formu yazdırma düzeltmesi |
| `packages/api/prisma/schema.prisma` | kvkkConsent, kvkkConsentAt, language, signatureData @db.Text |
| `packages/api/prisma/migrations/...` | 2 migration: kvkk_consent_fields, customer_language |
| `packages/api/src/routes/customers.ts` | language, kvkkConsent API'ye eklendi |
| `packages/api/src/services/waiverPdf.ts` | 8 madde, kooperatif adı, tek sayfa PDF |
| `packages/web/public/skytrack-logo.png` | YENİ — SkyTrack origami logosu |

### Sonraki Adımlar

- [ ] Müşteri landing page'inde (/c/{displayId}) seçilen dili kullanma
- [ ] Raporlarda Rest kategorisi ayrı gösterilmeli
- [ ] iOS bildirimde Türkçe karakter sorunu
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

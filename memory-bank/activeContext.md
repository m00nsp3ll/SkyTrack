# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-25 (Oturum 25)

### Yapılan İşler

1. **POS "Rest" Kategorisi Eklendi** ✅
   - Acentadan gelen müşterilerin kalan ödeme bakiyesi için yeni kategori
   - Tüm CATEGORIES dizilerine eklendi (7 dosya: API, POS, admin products, customers)
   - POS'ta ilk sırada, kırmızı tema (bg-red-50, border-red-200)
   - Rest ürünü sabit fiyatsız — tıklandığında serbest tutar giriş modalı açılır
   - Modal: € simgesi, büyük input, TRY karşılığı, Enter/Escape kısayolları

2. **Kullanıcı Bazlı POS Kategori Yetkileri** ✅
   - Prisma schema: User modeline `posCategories Json?` alanı eklendi + migration
   - Backend API: `GET/PUT /api/users/pos-categories` endpoint'leri
   - Auth: Login/me'de kullanıcı bazlı posCategories, rol default'ını override eder
   - Backward compat: posCategories yoksa rol varsayılanı kullanılır

3. **Staff Sayfasına "Kasiyer Yetkileri" Sekmesi** ✅ (`/admin/staff`)
   - 3 sekme: Personel Listesi / Personel Rolleri / Kasiyer Yetkileri
   - Her kasiyer için satır içi POS kategori checkbox'ları
   - "Özel Atama" badge, "Sıfırla" (rol varsayılanına dön), "Kaydet" butonları
   - Turuncu tema, Rest checkbox kırmızı accent
   - Personel Rolleri sekmesindeki POS Kategori Yetkileri kaldırıldı (kullanıcı bazlı yeterli)

4. **POS Sayfasında Kategori Filtreleme** ✅
   - `getVisibleCategories()`: localStorage'dan kullanıcı permissions okur
   - ADMIN → tümü, posCategories undefined → tümü (fallback)
   - "Tüm Ürünler" sadece izin verilen kategorilerdeki ürünleri gösterir

5. **PWA Cache Sorunu Düzeltildi** ✅
   - Development modda PWA cache devre dışı bırakıldı (`disable: process.env.NODE_ENV === 'development'`)
   - Eski JS cache'leri overlay sorununa neden oluyordu

6. **Manifest & Meta Tag Düzeltmeleri** ✅
   - manifest.json: var olmayan PNG ikonlar → mevcut SVG ikonlara güncellendi
   - layout.tsx: `apple-mobile-web-app-capable` → `mobile-web-app-capable` (deprecated fix)

7. **Staff Modal Overlay Düzeltmesi** ✅
   - Modal arka planına tıklayınca kapanma eklendi (onClick + stopPropagation)
   - Hata durumunda da modal kapanır

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/api/prisma/schema.prisma` | User modeline posCategories Json? eklendi |
| `packages/api/prisma/migrations/20260225...` | Migration: add_user_pos_categories |
| `packages/api/src/routes/products.ts` | Rest kategorisi eklendi |
| `packages/api/src/routes/users.ts` | posCategories default + backward compat + API endpoints |
| `packages/api/src/routes/auth.ts` | Login/me'de kullanıcı bazlı posCategories override |
| `packages/api/prisma/seed.ts` | Rest Ödemesi ürünü (fiyat: 0) + posCategories tüm rollere |
| `packages/web/app/(dashboard)/pos/page.tsx` | Rest filtreleme, kırmızı stil, fiyat giriş modalı |
| `packages/web/app/(dashboard)/admin/staff/page.tsx` | Kasiyer Yetkileri sekmesi, rol POS yetkileri kaldırıldı |
| `packages/web/app/(dashboard)/admin/products/page.tsx` | Rest kategorisi |
| `packages/web/app/(dashboard)/admin/products/new/page.tsx` | Rest kategorisi |
| `packages/web/app/(dashboard)/admin/products/[id]/edit/page.tsx` | Rest kategorisi |
| `packages/web/app/(dashboard)/admin/customers/[id]/page.tsx` | Rest kategorisi |
| `packages/web/next.config.js` | PWA cache dev'de devre dışı |
| `packages/web/public/manifest.json` | SVG ikonlara güncellendi |
| `packages/web/app/layout.tsx` | Deprecated meta tag düzeltmesi |

### Sonraki Adımlar

- [ ] Raporlarda Rest kategorisi ayrı gösterilmeli
- [ ] iOS bildirimde Türkçe karakter sorunu
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

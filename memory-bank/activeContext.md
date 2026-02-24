# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-23 (Oturum 24)

### Yapılan İşler

1. **Önizleme İstasyonu Yeniden Yazıldı** ✅ (`/admin/media/seller`)
   - Satış/ödeme kısmı tamamen kaldırıldı
   - Sadece pilot listesi ve klasör açma fonksiyonu
   - 3 özet kart: Aktif Pilot, Toplam Dosya, Bekleyen/Satılan
   - Pilot kartları: ad, uçuş sayısı, dosya/satılan/bekleyen istatistikleri
   - Tıklayınca pilotun klasörü açılır (Finder)
   - 30 saniyede otomatik yenileme + manuel yenile butonu

2. **Header Döviz Kurları Düzeltildi** ✅
   - Her dövizin TL karşılığı gösterilir: `€ ₺51.38`, `$ ₺43.12`, `£ ₺65.44`, `₽ ₺0.52`
   - EUR/TRY doğrudan, diğerleri cross-rate hesaplamayla
   - Renkli simgeler: € kırmızı, $ yeşil, £ mavi, ₽ turuncu

3. **Sidebar Active Durumu Düzeltildi** ✅
   - `/admin/customers/new` → sadece "Müşteri Kayıt" aktif, "Müşteri Listesi" değil
   - `/admin/media/seller` veya `/admin/media/pos` → sadece o menü aktif, "Foto/Video Raporu" değil
   - Daha spesifik eşleşme varsa üst yol aktif gösterilmez

4. **Personel Yetkileri Güncellendi** ✅ (`/admin/staff`)
   - `menuStructure` sidebar ile birebir eşleştirildi
   - Eksik eklenenler: Foto/Video Satış, Vezne Raporu
   - Etiket düzeltmeleri: Medya Yönetimi→Foto/Video Raporu, Günlük Rapor→Kasa Raporu

5. **Seed Data Yüklendi** ✅
   - 38 Pilot, 42 Kullanıcı, 35 Müşteri, 35 Uçuş, 74 Satış, 17 Ürün

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/web/app/(dashboard)/admin/media/seller/page.tsx` | Tamamen yeniden yazıldı (satış kaldırıldı, sadece pilot önizleme) |
| `packages/web/components/layout/Header.tsx` | Döviz kurları TL karşılığı gösterim |
| `packages/web/components/layout/Sidebar.tsx` | isActive mantığı düzeltildi |
| `packages/web/app/(dashboard)/admin/staff/page.tsx` | menuStructure sidebar ile eşleştirildi |

### Sonraki Adımlar

- [ ] iOS bildirimde Türkçe karakter sorunu araştır
- [ ] Admin cron job bildirimleri
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

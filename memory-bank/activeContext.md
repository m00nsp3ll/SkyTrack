# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-03-29 (Oturum 32)

### Yapılan İşler

1. **Müşteri Listesi Timezone Bug Düzeltmesi** ✅
   - **Sorun:** A0044/A0045 Türkiye saatiyle 29 Mart gece yarısını geçince kaydedildi (UTC: 28 Mart 21:07/21:17). Frontend `toISOString().split('T')[0]` kullandığı için UTC tarihi gönderiyordu, müşteriler listede görünmüyordu.
   - **Kök neden 1 (Frontend):** `getQuickDates()` fonksiyonu `toISOString()` kullandığı için UTC tarihi hesaplıyordu. Türkiye UTC+3 olduğundan gece yarısından sonra hâlâ bir önceki günü gönderiyordu.
   - **Kök neden 2 (API):** `process.env.TZ = 'Europe/Istanbul'` zaten `index.ts`'te ayarlıydı, `setHours(0,0,0,0)` Türkiye geceyarısını doğru UTC'ye çeviriyordu — API tarafı zaten doğruydu.
   - **Düzeltme (Frontend):** `packages/web/app/(dashboard)/admin/customers/page.tsx` — `toLocalDateStr()` helper eklendi, `getDate()/getMonth()/getFullYear()` kullanarak tarayıcı yerel saatine göre tarih üretiyor.

2. **QNAP NAS SSH Entegrasyonu** ✅ (Oturum 31'den)
   - ssh2 paketi kuruldu
   - qnapService.ts oluşturuldu (SSH ile klasör oluşturma, listeleme, bağlantı testi, disk kullanımı)
   - Klasör yapısı: /share/skytrack-media/YYYY-MM-DD/PilotAdi/MusteriKodu
   - chmod 777 ile yazma izni

3. **NAS Entegrasyonu Diğer** ✅ (Oturum 31'den)
   - Customer kaydında otomatik NAS klasör açma
   - mediaFolderPath DB alanı eklendi (migration: 20260328203640)
   - "Klasör Aç" butonu artık SMB yolu açıyor (smb://192.168.1.111/skytrack-media/...)
   - Sistem İzleme sayfasına NAS durumu + disk kullanımı eklendi
   - GET /api/nas/status, GET /api/nas/disk-usage endpoint'leri

### Değiştirilen Dosyalar (Oturum 32)

| Dosya | İşlem |
|-------|-------|
| packages/web/app/(dashboard)/admin/customers/page.tsx | toLocalDateStr() helper eklendi, timezone-safe tarih hesaplama |

### Değiştirilen Dosyalar (Oturum 31 — commit bekliyor)

| Dosya | İşlem |
|-------|-------|
| packages/api/package.json | ssh2 ^1.17.0 eklendi |
| packages/api/src/services/qnapService.ts | Oluşturuldu |
| packages/api/src/routes/nas.ts | Oluşturuldu |
| packages/api/src/routes/customers.ts | qnap import + klasör oluşturma + timezone-safe tarih filtresi |
| packages/api/src/routes/media.ts | "Klasör Aç" SMB yolu düzeltmesi |
| packages/api/src/index.ts | nasRoutes + TZ=Europe/Istanbul |
| packages/api/prisma/schema.prisma | mediaFolderPath alanı |
| packages/api/prisma/migrations/20260328203640_add_media_folder_path | Oluşturuldu |
| packages/web/app/(dashboard)/admin/nas/page.tsx | Oluşturuldu |
| packages/web/app/(dashboard)/admin/reports/system/page.tsx | NAS durumu kartı eklendi |

### Kritik Teknik Bilgiler

#### Timezone (ÖNEMLİ)
- API: `process.env.TZ = 'Europe/Istanbul'` index.ts'te ayarlı → tüm `setHours()` çağrıları TR saatiyle çalışıyor
- Frontend: `toLocalDateStr()` helper kullan, `toISOString().split('T')[0]` KULLANMA (UTC döner)
- JS `new Date('2026-03-29')` her zaman UTC parse eder, ardından `setHours(0,0,0,0)` TZ'den etkilenir

#### NAS Mimari
- FileStation API çalışmıyor (QTS 5.2 status 12 bug) → SSH kullanılıyor
- QNAP_SSH_HOST: 192.168.1.111, Port: 22, User: admin
- Medya yolu: /share/skytrack-media/YYYY-MM-DD/PilotAdi/MusteriKodu
- SMB format (Mac): smb://192.168.1.111/skytrack-media/...
- SMB format (Win): \\192.168.1.111\skytrack-media\...

### Sonraki Adımlar

- [ ] Sidebar'a "NAS" menü linki ekle
- [ ] Raporlarda Rest kategorisi ayrı gösterilmeli
- [ ] iOS bildirimde Türkçe karakter sorunu
- [ ] Production PM2 yapılandırması
- [ ] Cloudflare kaldır, tam lokal LAN mimarisi (uzun vadeli)

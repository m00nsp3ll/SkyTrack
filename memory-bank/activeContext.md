# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-12 (Oturum 3)

### Yapılan İşler

1. **Personel Satış Takip ve Raporlama Sistemi**

   **Özellikler:**
   - Her satışta personel bilgisi (`soldById`, `soldBy`) kaydediliyor
   - Gelir raporunda personel performans tablosu (top 10)
   - Kasa raporunda satış yapan personel ve saat bilgisi
   - Yeni "Vezne Raporu" sayfası - tüm personel performansı
   - Personel detay sayfası - kategori bazlı satış analizi
   - Tıklanabilir linklerle sayfa geçişleri (personel → detay, müşteri → portfolyo)

   **Değiştirilen Dosyalar:**
   - Backend: `/packages/api/src/routes/reports.ts` (staff-sales endpoint eklendi)
   - Revenue Report: `/packages/web/app/(dashboard)/admin/reports/revenue/page.tsx`
   - Daily Sales: `/packages/web/app/(dashboard)/admin/sales/daily/page.tsx`
   - **YENİ** Cashier Report: `/packages/web/app/(dashboard)/admin/reports/cashier/page.tsx`
   - **YENİ** Staff Sales Detail: `/packages/web/app/(dashboard)/admin/reports/staff-sales/page.tsx`
   - Sidebar: `/packages/web/components/layout/Sidebar.tsx` (menü isimleri güncellendi)

2. **Personel Detay Sayfası İyileştirmeleri**

   **Değişiklikler:**
   - Bekleyen Ödeme kartı sarıdan **kırmızıya** çevrildi (header'da)
   - Saatlik Satış Dağılımı kaldırıldı (gereksiz)
   - Bekleyen ödemeler için **modal/panel** sistemi eklendi
   - Header'daki kırmızı karta tıklayınca bekleyen ödemeler pop-up açılıyor
   - Modal: Kırmızı tema, tüm ödenmemiş satışlar liste halinde, müşteri linkleriyle

3. **Cloudflare Tunnel Yeniden Başlatıldı**

   - Önceki oturumdan kalma durum
   - 4 QUIC bağlantısı aktif (Istanbul sunucuları)

### Yeni Sayfalar ve Rotalar

| Rota | Sayfa | Açıklama |
|------|-------|----------|
| `/admin/sales/daily` | Kasa Raporu | Günlük satış detayları + personel/saat bilgisi |
| `/admin/reports/cashier` | Vezne Raporu | Tüm personel performansı (kartlar + tablo) |
| `/admin/reports/staff-sales?staffId=xxx` | Personel Detay | Bireysel satış analizi + bekleyen ödemeler modal |

### API Endpoint'ler

**Yeni:**
- `GET /api/reports/staff-sales` - Tüm personel özet listesi
- `GET /api/reports/staff-sales?staffId=xxx` - Personel detaylı rapor

**Güncellenen:**
- `GET /api/reports/revenue` - `topStaff` alanı eklendi (id dahil)
- `GET /api/reports/daily/:date` - Satışlara `soldBy` bilgisi eklendi

### Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `/packages/api/src/routes/reports.ts` | Raporlama API'leri (staff-sales endpoint - 150+ satır) |
| `/packages/web/app/(dashboard)/admin/reports/staff-sales/page.tsx` | Personel detay sayfası + bekleyen ödemeler modal |
| `/packages/web/app/(dashboard)/admin/reports/cashier/page.tsx` | Vezne raporu - personel performans kartları |
| `/packages/web/components/layout/Sidebar.tsx` | Güncellenmiş menü yapısı |

### Tasarım Kararları

1. **Bekleyen Ödemeler Modal Yaklaşımı:**
   - Ana sayfada büyük kart yerine header'da kompakt kart
   - Karta tıklayınca full-screen modal açılıyor
   - Müşteri linkleri modal içinden çalışıyor (modal kapanıyor, sayfaya gidiyor)

2. **Kategori Bazlı Satış Gösterimi:**
   - Accordion pattern kullanıldı (ChevronDown/ChevronUp)
   - Her kategori genişletilebilir, altında satışlar liste halinde
   - Progress bar ile görsel gösterim

3. **Personel Performans Gösterimi:**
   - İlk 3 sıra için madalya sistemli kartlar (🥇🥈🥉)
   - Progress bar ile katkı oranı gösterimi
   - Tıklanabilir kartlarla detay sayfasına yönlendirme

### Hızlı Başlatma Komutları

**Tek Komut (Önerilen):**
```bash
./scripts/start-all.sh
```

**Manuel Başlatma:**
```bash
docker-compose up -d
npm run dev:api &
npm run dev:web:https &
cloudflared tunnel run skytrack &
```

**Durdurma:**
```bash
./scripts/stop-all.sh
```

### Sonraki Adımlar

1. ~~Personel satış takip sistemi~~ ✅ TAMAMLANDI
2. Pilot performans raporu detaylandırma
3. Müşteri akışı raporu geliştirme
4. PDF Türkçe font desteği
5. Production deployment yapılandırması (PM2)
6. iOS uygulama build (ileride)

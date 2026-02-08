# Active Context - SkyTrack

## Son Çalışma Oturumu: 2024-02-08

### Yapılan İşler

1. **QR Tarama Düzeltmeleri**
   - HTTPS desteği eklendi (mobil kamera için zorunlu)
   - Self-signed SSL sertifikası oluşturuldu
   - Dinamik IP algılama eklendi (`networkUtils.ts`)
   - QR kod URL'leri HTTPS olarak güncellendi

2. **Mobil Sidebar Düzeltmeleri**
   - Scroll problemi çözüldü (`min-h-screen` → `h-screen`)
   - Menü tıklandığında kapanma eklendi (`onNavigate` prop)

3. **Pilot Detay Sayfası İyileştirmeleri**
   - Toplam uçuş istatistikleri eklendi
   - Tarih filtresi eklendi (from/to)
   - Uçuşlar tıklanabilir yapıldı (müşteri sayfasına link)
   - Tarih filtresi yukarı taşındı

4. **Uçuş Takibi Düzeltmeleri**
   - Kartlara tıklayınca müşteri sayfasına yönlendirme
   - Havada olan kartlar mavi arka plan
   - Border kalınlığı düzeltmesi

5. **Medya API Route Düzeltmesi**
   - Statik route'lar (`/stats/today`, `/storage`, `/folders`) dinamik route'lardan (`/:customerId`) önce taşındı

6. **Risk Formu Depolama Güncellendi**
   - Yeni yol: `./media/Risk Formlari/{displayId}/{Ad Soyad} risk_formu.pdf`
   - Türkçe karakterler korunuyor

### Sonraki Adımlar

1. Memory bank'ı GitHub'a commit et
2. Medya yönetimi sistemini test et (gerçek dosya yükleyerek)
3. POS satış sistemini tamamla
4. Raporlama modüllerini ekle

### Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `packages/api/src/utils/networkUtils.ts` | Dinamik IP algılama |
| `packages/api/src/services/waiverPdf.ts` | Risk formu PDF oluşturma |
| `packages/api/src/routes/media.ts` | Medya API (route sıralaması düzeltildi) |
| `packages/web/server.js` | HTTPS sunucu |
| `certs/localhost.key`, `certs/localhost.crt` | SSL sertifikaları |

### Deployment Tartışması

- Proje LAN için tasarlandı
- Uzak sunucuya deploy edilirse medya transfer sorunu olur
- Önerilen: Yerel sunucu (mini PC/NAS) + bulut yedekleme

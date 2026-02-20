# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-02-20 (Oturum 22)

### Yapılan İşler

1. **LAN İndirme — HTTPS + Otomatik Yönlendirme** ✅
   - LAN download sunucusu HTTP → HTTPS'e çevrildi (self-signed sertifika)
   - Chrome HTTPS→HTTP mixed content engelini çözmek için
   - Discover callback içinde `isLan: true` ise direkt `window.location.href` ile yönlendirme
   - WiFi'deki müşteri: QR tarar → `https://192.168.1.101:3080/api/media/A0030/download` → indirme başlar
   - İnternetteki müşteri: QR tarar → müşteri kartı sayfası açılır → butonla indirir

### Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `packages/api/src/routes/network.ts` | `lanBaseUrl: https://IP:3080` (HTTP→HTTPS) |
| `packages/api/src/index.ts` | LAN sunucu `createHttpsServer` ile başlıyor |
| `packages/web/app/c/[displayId]/page.tsx` | Discover callback içinde otomatik redirect |

### Akış

```
WiFi'deki müşteri:
  QR → sayfa yüklenir → discover API → isLan: true
  → direkt window.location.href = https://192.168.1.101:3080/api/media/A0030/download
  → indirme başlar (HTTPS→HTTPS, Chrome engellemez)

İnternetteki müşteri:
  QR → sayfa yüklenir → discover API → isLan: false
  → müşteri kartı sayfası açılır → butonla Cloudflare üzerinden indirir
```

### Sonraki Adımlar

- [ ] iOS bildirimde Türkçe karakter sorunu araştır
- [ ] Admin cron job bildirimleri
- [ ] Production PM2 yapılandırması
- [ ] Excel export özelliği
- [ ] PDF Türkçe font desteği

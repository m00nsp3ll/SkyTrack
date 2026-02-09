# Active Context - SkyTrack

## Son Çalışma Oturumu: 2025-02-09

### Yapılan İşler

1. **Cloudflare Tunnel & Custom Domain Yapılandırması**
   - skytrackyp.com ana domain yapılandırıldı
   - api.skytrackyp.com API subdomain eklendi
   - www.skytrackyp.com desteği eklendi
   - Tunnel config güncellendi (~/.cloudflared/config.yml)

2. **Socket.IO Custom Domain Desteği**
   - lib/socket.ts dinamik URL hesaplaması eklendi
   - skytrackyp.com için api.skytrackyp.com kullanılıyor
   - Bağlantı durumu (yeşil/kırmızı WiFi) düzeltildi

3. **Push Notification Güncellemesi**
   - PushNotificationManager.tsx dinamik API URL eklendi
   - Eski hardcoded Cloudflare tunnel URL'leri temizlendi

4. **Oturum Tutarlılığı (www → non-www)**
   - Login, admin layout ve pilot panel'de www yönlendirmesi eklendi
   - localStorage farklı domain sorunu çözüldü
   - Token artık kaybolmuyor

5. **Pilot Panel UI Güncellemeleri**
   - Sıra gösterimi stats kartlarına eklendi
   - Profil sidebar soldan açılacak şekilde güncellendi
   - Slide-in-left animasyonu Tailwind config'e eklendi
   - Dinamik sıra hesaplaması (API'de)

6. **QR Kod & İndirme Linkleri**
   - Tüm QR kodlar custom domain kullanıyor
   - Müşteri indirme linkleri düzeltildi
   - Mevcut 17 müşterinin QR kodları güncellendi

7. **API URL Düzeltmeleri**
   - lib/api.ts dinamik URL (eski tunnel URL temizlendi)
   - Müşteri detay sayfası URL helper fonksiyonları
   - Müşteri indirme sayfası API URL düzeltmesi

### Önemli Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `~/.cloudflared/config.yml` | Tunnel yapılandırması (www dahil) |
| `packages/web/lib/socket.ts` | Socket.IO dinamik URL |
| `packages/web/lib/api.ts` | API dinamik URL |
| `packages/web/components/pwa/PushNotificationManager.tsx` | Push dinamik URL |
| `packages/web/app/(auth)/login/page.tsx` | www yönlendirmesi |
| `packages/web/app/(dashboard)/layout.tsx` | www yönlendirmesi |
| `packages/web/app/pilot/page.tsx` | www yönlendirmesi, sidebar sol, sıra gösterimi |
| `packages/web/tailwind.config.ts` | Slide-in animasyonları |
| `packages/api/src/routes/pilots.ts` | Dinamik sıra hesaplaması |
| `packages/api/src/routes/customers.ts` | Custom domain QR URL |

### Cloudflare Tunnel Bilgileri

```yaml
tunnel: 4ef0fae8-2ca5-4900-9351-4fd95cf0135b
ingress:
  - hostname: skytrackyp.com → https://localhost:3000
  - hostname: www.skytrackyp.com → https://localhost:3000
  - hostname: api.skytrackyp.com → https://localhost:3001
```

### DNS Kayıtları (Cloudflare)

| Type | Name | Target |
|------|------|--------|
| CNAME | @ | 4ef0fae8-2ca5-4900-9351-4fd95cf0135b.cfargotunnel.com |
| CNAME | api | 4ef0fae8-2ca5-4900-9351-4fd95cf0135b.cfargotunnel.com |
| CNAME | www | 4ef0fae8-2ca5-4900-9351-4fd95cf0135b.cfargotunnel.com |

### Sonraki Adımlar

1. Cloudflare'de www → non-www redirect kuralı ekle (opsiyonel, daha hızlı)
2. Raporlama modüllerini tamamla
3. PDF Türkçe font desteği ekle

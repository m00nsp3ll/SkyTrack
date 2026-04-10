# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-10 (Oturum 41)

### ✅ ÇÖZÜLDÜ — LAN hızında indirme aktif

**Mimari (yeni):** Müşteri (LAN/WAN) → modem (hairpin NAT veya WAN forward) → NAS HTTPS direkt
**VDS hiç yok** — sadece API çağrısı 302 redirect döndürüyor.

**Adımlar:**
1. NAS'ta Let's Encrypt SSL kuruldu (`skytrack.myqnapcloud.com`, expires 2026-07-08)
2. NAS Web Server Virtual Host: HTTPS port **8443**, doc root `/share/skytrack-media`
3. TP-Link router'da port forward: dış 8443 → 192.168.1.105:8443 TCP
4. Modem hairpin NAT zaten çalışıyor (LAN içinden public IP çağırınca kendine dönüyor)
5. NAS'ta `/usr/local/sbin/zip` mevcut — `/api/media/:id/download` endpoint'i artık NAS-side ZIP oluşturup `https://skytrack.myqnapcloud.com:8443/.zips/<displayId>/Alanya Paragliding.zip` URL'ine 302 redirect yapıyor
6. Müşteri direkt NAS'tan ZIP indirir: LAN → gigabit, WAN → ofis upload
7. ZIP'ler 24h sonra `cleanupOldZips()` ile silinir (best-effort, her download'da tetikleniyor)
8. NAS `.htaccess`: `Options -Indexes` (directory listing kapalı, güvenlik)

**Doğrulama (end-to-end):**
- `curl -I https://api.skytrackyp.com/api/media/A0072/download` → 302 → NAS HTTPS → 200, application/zip ✅
- Cert valid (Let's Encrypt), accept-ranges: bytes (mobile resume ✅), CORS aktif

### 🚨 ÖNCEKI (2026-04-09) — Çözüldü, referans için saklı

**Müşteri indirme sayfası VDS üzerinden indiriyor, ağ hızında değil!**

Şu an olan:
`Müşteri (WiFi) → api.skytrackyp.com (VDS) → NAS SSH → VDS → Müşteri`

Olması gereken:
`Müşteri (WiFi) → 192.168.1.105 (NAS direkt) → Müşteri`

**Sorun:** NAS sadece HTTP (port 8082) sunuyor. HTTPS sayfası (`skytrackyp.com`) HTTP kaynaklarına mixed content nedeniyle erişemiyor.

**Çözüm seçenekleri (yarın karar verilecek):**
1. **NAS'a Let's Encrypt SSL kur** → QNAP panelinde SSL sertifikası, subdomain ile HTTPS servis
2. **QNAP myqnapcloud subdomain** → `skytrack.myqnapcloud.com` zaten HTTPS verebiliyor, LAN'da da çalışır
3. **Cloudflare Tunnel NAS'a** → NAS üzerinde cloudflared çalıştır, subdomain yönlendir

**Mevcut durum (çalışıyor ama yavaş):**
- ZIP indirme çalışıyor ✅
- ZIP adı "Alanya Paragliding.zip" ✅  
- 2 dosya da ZIP içinde görünüyor ✅
- Ama VDS üzerinden geçiyor ❌ (ağ hızında değil)

**LAN detection çalışıyor:**
- Ofis public IP: `81.213.175.47`
- `GET /api/network/discover` → isLan: true/false
- Ama LAN tespiti yapılsa bile NAS'a SSL olmadan direkt bağlanamıyoruz

**NAS Virtual Host:**
- Port: 8082
- Doc root: `/share/skytrack-media`
- `.htaccess` CORS yazıldı (`Access-Control-Allow-Origin: *`)

---

### Bu Oturumda Yapılanlar

1. **ZIP indirme düzeltildi** ✅
   - ZIP endpoint'i artık NAS'tan SSH ile dosyaları çekiyor (VDS'deki boş `./media` klasörü değil)
   - `qnap.downloadFile()` metodu eklendi
   - Recursive alt klasör tarama eklendi
   - ZIP adı "Alanya Paragliding.zip" yapıldı

2. **API proxy endpoint eklendi** ✅
   - `GET /api/media/:customerId/proxy-file/:filename`
   - NAS'tan dosyayı SSH ile çekip müşteriye stream ediyor
   - SSL sorunu yok (API HTTPS üzerinde)

3. **lan-info endpoint güncellendi** ✅
   - NAS HTTP URL yerine API proxy URL döndürüyor
   - Recursive dosya listeleme

4. **NAS .htaccess CORS** ✅
   - `/share/skytrack-media/.htaccess` yazıldı
   - `Access-Control-Allow-Origin: *` aktif

---

### Production Sunucu Bilgileri
- **IP:** 166.1.91.9 (2026-04-10 değişti — eski 5.10.220.205, Dehost altyapı/routing sorunu)
- **Hostname:** skytrack-server
- **SSH:** `sshpass -p '7e930a56874c!diyo@' ssh -o StrictHostKeyChecking=no root@166.1.91.9`
- **Proje dizini:** /opt/skytrack
- **Node PATH:** `$(ls -d /root/.nvm/versions/node/*/bin | tail -1)`
- **PM2:** skytrack-api (id:4), skytrack-web (id:5)
- **Domain (önerilen erişim):** skytrackyp.com, api.skytrackyp.com, www.skytrackyp.com → 166.1.91.9
- **Deploy komutu:**
```bash
sshpass -p '7e930a56874c!diyo@' ssh -o StrictHostKeyChecking=no root@166.1.91.9 "export PATH=\$PATH:\$(ls -d /root/.nvm/versions/node/*/bin 2>/dev/null | tail -1) && cd /opt/skytrack && git pull origin main && cd packages/api && npm run build && pm2 restart skytrack-api && cd /opt/skytrack/packages/web && npm run build && pm2 restart skytrack-web && echo DONE"
```

### QNAP NAS Bilgileri
- **LAN IP:** 192.168.1.105
- **SSH:** `sshpass -p 'parasut26' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -p 22 admin@192.168.1.105`
- **Medya yolu:** /share/skytrack-media
- **Virtual Host:** port 8082, doc root /share/skytrack-media

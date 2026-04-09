# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-09 (Oturum 39)

### Yapılan İşler

1. **KIOSK Rolü ve Arayüzü** ✅
   - `UserRole` enum'una `KIOSK` eklendi (Prisma schema + DB ALTER TYPE)
   - `/kiosk` route'u oluşturuldu (sidebar/header yok, tam ekran iPad optimize)
   - Dil seçimi → Kayıt formu → Waiver + imza → Başarı ekranı akışı
   - Kayıt sonrası otomatik 2 kopya yazdırma (müşteri + pilot, farklı renkli etiket)
   - 15 saniye geri sayım sonrası otomatik sıfırlama
   - DB: `kiosk` kullanıcısı oluşturuldu (şifre: `kiosk`, rol: KIOSK)
   - `customers.ts`: KIOSK rolüne POST /customers yetkisi eklendi

2. **Media Scan QNAP Fix** ⚠️ (Devam ediyor — ofise geçince test edilecek)
   - `media/.` DB corruption temizlendi (3 satır güncellendi)
   - `findCustomerFolder`: grep tabanlı yöntem deploy edildi ama Türkçe dizinlerde hâlâ sorun var
   - Çalışan yöntem belirlendi: `for d in /share/skytrack-media/*/*/; do test -d "${d}DISPLAYID"...`
   - Ofiste QNAP SSH erişimi ile for-loop fix deploy edilecek

3. **LAN Algılama Fix** ✅
   - nginx proxy üzerinden IP tespiti yerine client-side ping yaklaşımı
   - `GET /api/network/ping` → tablet aynı ağdaysa hızlı yanıt, değilse timeout
   - `lanIp` her zaman expose ediliyor, frontend 1.5s timeout ile ping atar

4. **POS Ekranı iPad Optimizasyonu** ✅
   - Sol müşteri sütunu: w-72 → w-48
   - Sağ sepet sütunu: w-96 → w-72
   - Ürün grid: gap-2 → gap-1.5, p-3 → p-2
   - Font boyutları küçüldü, kategori tab'ları flex-wrap

5. **Production Deploy** ✅
   - Sunucu: root@5.10.220.205 (şifre memory'de)
   - sshpass ile bağlantı çalışıyor
   - GitHub token: (memory/reference_server.md'de)
   - Deploy akışı: git push → ssh pull → build → pm2 restart

### Tamamlanan Task'lar (Bu Oturumda Kapatıldı)
- ✅ Pilot panel sidebar + bildirim iyileştirmeleri
- ✅ Admin queue drag & drop düzeltmesi
- ✅ Pilot sidebar - Toplam Uçuş Sayısı yeniden tasarım + tarih filtresi
- ✅ Kiosk rolü ve kiosk arayüzü

### Açık Kalan Task
- ⚠️ Media scan QNAP SSH fix (for-loop yöntemi) — ofiste test edilecek

### Production Sunucu Bilgileri
- **IP:** 5.10.220.205
- **SSH:** root@5.10.220.205 (şifre: memory/reference_server.md'de)
- **Proje dizini:** /opt/skytrack
- **Node PATH:** /root/.nvm/versions/node/v20.20.2/bin
- **PM2:** skytrack-api (port 3001), skytrack-web (port 3000)
- **GitHub:** github.com/m00nsp3ll/SkyTrack
- **GitHub Token:** (memory/reference_server.md'de)
- **Deploy:** `cd /opt/skytrack && git pull origin main && export PATH=/root/.nvm/versions/node/v20.20.2/bin:$PATH && cd packages/api && npm run build && pm2 restart skytrack-api && cd /opt/skytrack/packages/web && npm run build && pm2 restart skytrack-web`

### QNAP NAS Bilgileri
- **LAN IP:** 192.168.1.105
- **SSH (LAN):** admin@192.168.1.105:22
- **SSH (External):** admin@skytrack.myqnapcloud.com:2222
- **SSH şifre:** parasut26
- **SSH Key (VDS):** /root/.ssh/nas_key
- **Medya yolu:** /share/skytrack-media

### Kiosk Kullanıcı Bilgileri
- **URL:** https://skytrackyp.com/kiosk
- **Kullanıcı adı:** kiosk
- **Şifre:** kiosk
- **iPad Kilit:** Settings → Accessibility → Guided Access (banka kiosk modu)

### Sonraki Adımlar (Ofise Geçince)
- [ ] QNAP SSH for-loop fix deploy (findCustomerFolder Türkçe dizin sorunu)
- [ ] A0066, A0064 scan testi
- [ ] iOS IPA çıkarma (Archive → Ad Hoc)
- [ ] Excel export özelliği

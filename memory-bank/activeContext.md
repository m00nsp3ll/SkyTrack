# Active Context - SkyTrack

## Son Çalışma Oturumu: 2026-04-20

### ✅ Pilot Sıra Öncelik Sistemi (priorityOverride)
- DB'ye `priority_override` boolean kolonu eklendi (pilots tablosu)
- Sıralama: `priorityOverride DESC → roundCount ASC → queuePosition ASC`
- Backend (pilotQueue.ts): getNextPilot, getQueueStatus, refreshQueueCache, nextFirst sorgularında priority eklendi
- Frontend (pilots/page.tsx, pilots/queue/page.tsx): sort fonksiyonlarına priorityOverride desteği
- Pilot uçuş aldığında priorityOverride otomatik false'a döner (tek seferlik)
- **ÖNEMLİ DERS**: Operasyon sırasında DB'de roundCount/queuePosition değişikliği yapılırken Redis cache eski sırayı tuttu → yanlış pilotlara atama yapıldı. **DB değişikliği sonrası mutlaka `redis-cli FLUSHALL && pm2 restart skytrack-api` yapılmalı.**

### ✅ Pilot Atama Onay Sistemi (Admin Gate)
- Müşteri kaydedilince pilot otomatik atanMIYOR, sadece önerilen pilot gösteriliyor
- Admin ekranında sarı kutuda önerilen pilot + "Onayla" ve "Pilot Değiştir" butonları
- "Pilot Değiştir" → müsait pilot listesi açılır, istenen pilot seçilir
- Onay verilene kadar pilota hiçbir bildirim (FCM/Socket.IO) gitmez
- Yeni API endpoint: `POST /api/customers/:id/confirm-pilot` (opsiyonel `pilotId` body)
- `assignPilotToCustomer()` artık opsiyonel `specificPilotId` parametresi kabul ediyor
- QNAP klasör oluşturma confirm-pilot endpoint'ine taşındı

### ✅ Pilot Sıra Düzeltmeleri
- Bahadır Ahmet Yalçın: queuePosition=9 (forma), roundCount düşürülerek ilk sıraya alındı
- Duplike Mehmet Başdağ kaydı silindi (roundCount=0 olan), doğru kayıt (BLUE SKYLIFE, rc=35) korundu
- m.basdag kullanıcısı doğru pilot kaydına bağlandı
- ESRA OLGAÇ: in_queue = true yapıldı (listede olmasına rağmen false'muş)
- Harun Sivaslı: is_active = false, in_queue = false (test hesabı, sıraya girmesin)

### 🔑 Pilotu İlk Sıraya Alma Prosedürü
Bir pilotu istisnai olarak ilk sıraya almak için:
1. `roundCount`'unu mevcut en düşük roundCount'un altına çek (ör: herkes 35 ise 34 yap)
2. `redis-cli FLUSHALL && pm2 restart skytrack-api`
3. Pilot uçuş alınca roundCount artar, doğal olarak sona gider
4. Alternatif: `priority_override = true` yap (kod desteği var, uçuş sonrası otomatik false olur)

### 🔐 Kimlik Bilgileri
```
Admin:  admin / Aa19866891!
Kiosk:  Kiosk / Kiosk
VDS SSH: root@166.1.91.9 / 22a5c8d1113a!diyo@
```

---

## Bilinen Sorunlar / TODO
- [ ] Etiket yazıcı: Brother QL-810W alınacak, AirPrint native destekli
- [ ] Etiket yazıcı: her baskıda 1 boş etiket fazla çıkıyor (PostAction ayarı)
- [ ] Kiosk yazdırma: iPad AirPrint ile tek sayfa/ortalama sorunları (yeni yazıcıyla çözülecek)
- [ ] Admin için ayrı iOS build planı (com.skytrackyp.admin bundle)
- [ ] Pilot ödeme yetkisi ADMIN → SUPER_ADMIN kısıtlaması (Tolga08 only)

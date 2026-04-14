@echo off
setlocal
:: SkyTrack Windows kurulum — bir defa çalıştırılır (yönetici olarak)

set "TARGET=C:\SkyTrack"
set "NAS=192.168.1.105"

echo === SkyTrack Kurulum ===
echo.

:: 1) Klasor olustur ve dosyalari kopyala
if not exist "%TARGET%" mkdir "%TARGET%"
copy /Y "%~dp0skytrack-launcher.vbs" "%TARGET%\" >nul
copy /Y "%~dp0skytrack-open.ps1"     "%TARGET%\" >nul
copy /Y "%~dp0skytrack-folder-handler.reg" "%TARGET%\" >nul
echo [OK] Dosyalar %TARGET% icine kopyalandi.

:: 2) Protokol kaydi (sessiz)
reg import "%TARGET%\skytrack-folder-handler.reg" >nul 2>&1
echo [OK] skytrack:// protokolu kayit edildi.

:: 3) NAS kimlik bilgisi kaydet (sifre bir daha sorulmaz)
echo.
echo NAS (%NAS%) icin kullanici adi ve sifre girin:
set /p NAS_USER="Kullanici: "
set /p NAS_PASS="Sifre:     "
cmdkey /add:%NAS% /user:%NAS_USER% /pass:%NAS_PASS% >nul
if %ERRORLEVEL% EQU 0 (
  echo [OK] NAS kimlik bilgisi kaydedildi.
) else (
  echo [UYARI] cmdkey hata verdi, elle kaydedin.
)

echo.
echo === Kurulum tamam. Tarayicidan "Klasoru Ac" butonunu kullanabilirsiniz. ===
pause

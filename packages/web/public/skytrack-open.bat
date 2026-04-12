@echo off
:: SkyTrack Klasör Açıcı
set "url=%~1"
:: "skytrack:" prefix'ini kaldır
set "url=%url:skytrack:=%"
:: URL encoding temizle
set "url=%url:%%20= %"
:: Explorer ile aç
start "" explorer.exe "%url%"

@echo off
:: SkyTrack Klasör Açıcı
set "url=%~1"
:: "skytrack:" prefix'ini kaldır
set "url=%url:skytrack:=%"
:: Forward slash'ı backslash'a çevir
set "url=%url:/=\%"
:: Explorer ile aç
start "" "C:\Windows\explorer.exe" "%url%"

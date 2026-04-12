@echo off
:: SkyTrack Klasör Açıcı
set "url=%~1"
:: "skytrack:" prefix'ini kaldır
set "url=%url:skytrack:=%"
:: Explorer tam yol ile aç
start "" "C:\Windows\explorer.exe" "%url%"

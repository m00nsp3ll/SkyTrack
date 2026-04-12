@echo off
:: SkyTrack Klasör Açıcı
:: skytrack: protocol'den gelen URL'i alıp Dosya Gezgini'nde açar
set "url=%~1"
:: "skytrack:" prefix'ini kaldır
set "path=%url:skytrack:=%"
:: Çift slash'ı düzelt
set "path=%path://=\%"
set "path=%path:/=\%"
explorer.exe "%path%"

@echo off
setlocal enabledelayedexpansion
set "LOG=C:\SkyTrack\skytrack-open.log"
echo === %DATE% %TIME% === >> "%LOG%"
echo RAW ARG: [%*] >> "%LOG%"
echo ARG1:    [%~1] >> "%LOG%"

set "url=%~1"
set "url=!url:skytrack:=!"
echo AFTER STRIP PROTO: [!url!] >> "%LOG%"

:: Baştaki / ve // temizle
if "!url:~0,2!"=="//" set "url=!url:~2!"
if "!url:~0,1!"=="/" set "url=!url:~1!"
:: Sondaki / veya \ temizle
if "!url:~-1!"=="/" set "url=!url:~0,-1!"
if "!url:~-1!"=="\" set "url=!url:~0,-1!"

:: / -> \
set "url=!url:/=\!"
echo AFTER SLASH FIX: [!url!] >> "%LOG%"

:: URL-decode via PowerShell
set "decoded="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "[System.Uri]::UnescapeDataString([Environment]::GetEnvironmentVariable('url','Process'))"`) do set "decoded=%%A"
echo DECODED: [!decoded!] >> "%LOG%"

set "final=\\!decoded!"
echo FINAL PATH: [!final!] >> "%LOG%"

:: Test exists
if exist "!final!\" (
  echo PATH EXISTS, opening... >> "%LOG%"
  start "" explorer.exe "!final!"
) else (
  echo PATH NOT FOUND! >> "%LOG%"
  echo.
  echo HATA: Klasor bulunamadi:
  echo !final!
  echo.
  echo Log: %LOG%
  pause
)

endlocal

@echo off
setlocal enabledelayedexpansion
set "LOG=C:\SkyTrack\skytrack-open.log"
echo === %DATE% %TIME% === >> "%LOG%"
echo RAW ARG: [%*] >> "%LOG%"
echo ARG1:    [%~1] >> "%LOG%"

if "%~1"=="" (
  echo HATA: Argüman gelmedi. Tarayıcıdan "Klasörü Aç" butonu ile çalıştırın.
  echo Log: %LOG%
  pause
  exit /b 1
)

set "url=%~1"
:: skytrack: prefix'ini kaldır (önce "skytrack://" sonra "skytrack:")
if /i "!url:~0,11!"=="skytrack://" (
  set "url=!url:~11!"
) else if /i "!url:~0,9!"=="skytrack:" (
  set "url=!url:~9!"
)
echo AFTER STRIP PROTO: [!url!] >> "%LOG%"

:: Sondaki / veya \ temizle
if "!url:~-1!"=="/" set "url=!url:~0,-1!"
if "!url:~-1!"=="\" set "url=!url:~0,-1!"

:: / -> \
set "url=!url:/=\!"
echo AFTER SLASH FIX: [!url!] >> "%LOG%"

:: URL-decode
set "decoded="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "[System.Uri]::UnescapeDataString([Environment]::GetEnvironmentVariable('url','Process'))"`) do set "decoded=%%A"
if "!decoded!"=="" set "decoded=!url!"
echo DECODED: [!decoded!] >> "%LOG%"

set "final=\\!decoded!"
echo FINAL PATH: [!final!] >> "%LOG%"

if exist "!final!\" (
  echo OPENING >> "%LOG%"
  start "" explorer.exe "!final!"
) else (
  echo PATH NOT FOUND >> "%LOG%"
  echo.
  echo HATA: Klasor bulunamadi:
  echo !final!
  echo.
  echo Log: %LOG%
  pause
)

endlocal

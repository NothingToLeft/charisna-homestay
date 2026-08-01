@echo off
setlocal
cd /d "%~dp0\..\.."
where node >nul 2>nul || (
  echo Node.js belum terpasang. Instal Node.js 22 LTS lalu jalankan file ini lagi.
  pause
  exit /b 1
)
call npm config set registry https://registry.npmjs.org/
call npm install --no-audit --no-fund || goto :error
call npm run check || goto :error
call npm test || goto :error
call npm run build:desktop:win || goto :error
echo.
echo Build selesai. Buka folder release.
explorer release
pause
exit /b 0
:error
echo Build gagal. Periksa pesan error di atas.
pause
exit /b 1

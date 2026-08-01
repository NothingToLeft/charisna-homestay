@echo off
setlocal
cd /d "%~dp0\..\.."
where node >nul 2>nul || (
  echo Node.js belum terpasang. Instal Node.js 22 LTS lalu jalankan file ini lagi.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm config set registry https://registry.npmjs.org/
  call npm install --no-audit --no-fund || goto :error
)
call npm run dev
exit /b 0
:error
echo Proses gagal. Periksa pesan error di atas.
pause
exit /b 1

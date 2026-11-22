@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Pasang Node.js 22.12 atau lebih baru, lalu jalankan ulang.
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22 || (v[0]===22 && v[1]<12)){console.error('Node.js terlalu lama. Pasang Node.js 22.12 atau lebih baru.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist node_modules\whatsapp-web.js\package.json (
  call npm ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 (
    echo Pemasangan dependency gagal. Periksa pesan di atas.
    pause
    exit /b 1
  )
)
start "" http://127.0.0.1:8772
call npm start
if errorlevel 1 pause

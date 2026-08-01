@echo off
setlocal
cd /d "%~dp0\..\.."
set /p VERSION=Masukkan versi tanpa huruf v, contoh 1.0.0:
if "%VERSION%"=="" (
  echo Versi tidak boleh kosong.
  pause
  exit /b 1
)
git add .
git commit -m "Release v%VERSION%"
git push
git tag v%VERSION%
git push origin v%VERSION%
if errorlevel 1 goto :error
echo Tag terkirim. Buka GitHub Actions lalu tunggu Build Release selesai.
pause
exit /b 0
:error
echo Rilis gagal. Jangan gunakan nomor tag yang sudah pernah dibuat.
pause
exit /b 1

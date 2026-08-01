@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VERSION=1.0.1"
set "TAG=v%VERSION%"

echo ============================================================
echo Management Offline Suite - Build Fix %TAG%
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git belum terpasang atau belum masuk PATH.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: File ini harus berada di folder utama project,
  echo yaitu folder yang berisi package.json dan folder .github.
  pause
  exit /b 1
)

if not exist .git (
  echo ERROR: Folder ini bukan repository Git lokal.
  echo Jalankan file ini dari folder project yang sebelumnya sudah di-push.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-Content -Raw package.json ^| ConvertFrom-Json; if ($p.devDependencies.'typescript-eslint' -ne '8.65.0') { exit 1 }"
if errorlevel 1 (
  echo ERROR: File perbaikan belum tertimpa dengan benar.
  echo Ekstrak ZIP patch ke folder utama project dan pilih Replace files.
  pause
  exit /b 1
)

git fetch origin --tags
if errorlevel 1 goto :error

git rev-parse -q --verify "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di komputer ini.
  echo Hapus tag hanya bila Anda yakin tag tersebut belum pernah dirilis.
  pause
  exit /b 1
)

git ls-remote --exit-code --tags origin "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di GitHub.
  echo Gunakan nomor versi baru sebelum menjalankan rilis ulang.
  pause
  exit /b 1
)

git add package.json CHANGELOG.md .github/workflows/ci.yml .github/workflows/release.yml
if errorlevel 1 goto :error

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix build dependency compatibility for %TAG%"
  if errorlevel 1 goto :error
) else (
  echo Tidak ada perubahan baru yang perlu di-commit.
)

git push origin main
if errorlevel 1 goto :error

git tag "%TAG%"
if errorlevel 1 goto :error

git push origin "%TAG%"
if errorlevel 1 goto :error

echo.
echo BERHASIL: Perbaikan dan tag %TAG% sudah dikirim.
echo Buka GitHub ^> Actions ^> Build Release dan tunggu sampai hijau.
echo Hasil installer Windows dan APK akan masuk ke Releases %TAG%.
pause
exit /b 0

:error
echo.
echo GAGAL: Periksa pesan error di atas. Tidak ada perintah force yang digunakan.
pause
exit /b 1

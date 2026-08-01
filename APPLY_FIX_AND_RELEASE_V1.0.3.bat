@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VERSION=1.0.3"
set "TAG=v%VERSION%"

echo ============================================================
echo Management Offline Suite - Desktop Release Fix %TAG%
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git belum terpasang atau belum masuk PATH.
  pause
  exit /b 1
)

where powershell >nul 2>nul
if errorlevel 1 (
  echo ERROR: Windows PowerShell tidak ditemukan.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: Jalankan file ini dari folder utama project.
  echo Folder tersebut harus berisi package.json, src, dan .github.
  pause
  exit /b 1
)

if not exist .git (
  echo ERROR: Folder ini bukan repository Git lokal.
  echo Gunakan folder project yang sebelumnya dikirim ke GitHub.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Get-Content -Raw package.json | ConvertFrom-Json;" ^
  "if ($p.version -ne '1.0.3') { Write-Error 'Versi package.json belum 1.0.3'; exit 1 };" ^
  "if ($p.scripts.'build:desktop:win' -notmatch '--publish never') { Write-Error 'build:desktop:win belum menonaktifkan implicit publish'; exit 1 };" ^
  "if ($p.scripts.'build:desktop' -notmatch '--publish never') { Write-Error 'build:desktop belum menonaktifkan implicit publish'; exit 1 };" ^
  "if (-not $p.author.name) { Write-Error 'Metadata author belum tersedia'; exit 1 }"
if errorlevel 1 (
  echo ERROR: File patch belum tertimpa dengan benar.
  echo Ekstrak ZIP patch ke folder utama lalu pilih Replace files.
  pause
  exit /b 1
)

findstr /C:"--publish never" package.json >nul
if errorlevel 1 (
  echo ERROR: package.json belum mengandung --publish never.
  pause
  exit /b 1
)

findstr /C:"Verify Windows packages" .github\workflows\release.yml >nul
if errorlevel 1 (
  echo ERROR: release.yml belum diperbarui.
  pause
  exit /b 1
)

findstr /C:"APP_VERSION = '1.0.3'" src\core\constants.ts >nul
if errorlevel 1 (
  echo ERROR: Versi runtime aplikasi belum 1.0.3.
  pause
  exit /b 1
)

git fetch origin --tags
if errorlevel 1 goto :error

git rev-parse -q --verify "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di komputer ini.
  echo Jangan menimpa tag rilis yang sudah pernah dibuat.
  pause
  exit /b 1
)

git ls-remote --exit-code --tags origin "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di GitHub.
  echo Gunakan versi baru hanya setelah source dinaikkan versinya.
  pause
  exit /b 1
)

if exist APPLY_FIX_AND_RELEASE_V1.0.1.bat git rm -f --ignore-unmatch APPLY_FIX_AND_RELEASE_V1.0.1.bat >nul 2>nul
if exist APPLY_FIX_AND_RELEASE_V1.0.2.bat git rm -f --ignore-unmatch APPLY_FIX_AND_RELEASE_V1.0.2.bat >nul 2>nul

git add package.json CHANGELOG.md ^
  .github\workflows\release.yml ^
  src\core\constants.ts ^
  docs\IMPLEMENTATION_NOTES.md ^
  docs\BUILD_FIX_V1.0.3.md ^
  README_PATCH_V1.0.3.txt ^
  APPLY_FIX_AND_RELEASE_V1.0.3.bat
if errorlevel 1 goto :error

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix Windows release publishing for %TAG%"
  if errorlevel 1 goto :error
) else (
  echo Tidak ada perubahan baru untuk di-commit.
)

git push origin main
if errorlevel 1 goto :error

git tag -a "%TAG%" -m "Management Offline Suite %TAG%"
if errorlevel 1 goto :error

git push origin "%TAG%"
if errorlevel 1 goto :error

echo.
echo BERHASIL: Source dan tag %TAG% sudah dikirim ke GitHub.
echo Buka GitHub ^> Actions ^> Build Release.
echo Gunakan hasil rilis %TAG%, bukan v1.0.2.
pause
exit /b 0

:error
echo.
echo GAGAL: Periksa pesan error di atas.
echo Script tidak menggunakan force push dan tidak menimpa tag lama.
pause
exit /b 1

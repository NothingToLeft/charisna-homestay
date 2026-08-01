@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VERSION=1.0.2"
set "TAG=v%VERSION%"

echo ============================================================
echo Management Offline Suite - TypeScript Build Fix %TAG%
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git belum terpasang atau belum masuk PATH.
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
  "if ($p.version -ne '1.0.2') { exit 1 };" ^
  "if ($p.scripts.typecheck -ne 'tsc -b') { exit 1 };" ^
  "$t = Get-Content -Raw tsconfig.node.json | ConvertFrom-Json;" ^
  "if ($t.compilerOptions.noEmit -ne $true) { exit 1 }"
if errorlevel 1 (
  echo ERROR: File patch belum tertimpa dengan benar.
  echo Ekstrak ZIP patch ke folder utama dan pilih Replace files.
  pause
  exit /b 1
)

findstr /C:"[db.properties, db.rooms, db.tenants" src\services\backupService.ts >nul
if errorlevel 1 (
  echo ERROR: backupService.ts belum diperbarui.
  pause
  exit /b 1
)

findstr /C:"const pageQuery: Query<DocumentData>" src\services\syncService.ts >nul
if errorlevel 1 (
  echo ERROR: syncService.ts belum diperbarui.
  pause
  exit /b 1
)

git fetch origin --tags
if errorlevel 1 goto :error

git rev-parse -q --verify "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di komputer ini.
  echo Gunakan tag baru hanya jika source juga dinaikkan versinya.
  pause
  exit /b 1
)

git ls-remote --exit-code --tags origin "refs/tags/%TAG%" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Tag %TAG% sudah ada di GitHub.
  echo Jangan menimpa tag rilis yang sudah ada.
  pause
  exit /b 1
)

if exist APPLY_FIX_AND_RELEASE_V1.0.1.bat git rm -f --ignore-unmatch APPLY_FIX_AND_RELEASE_V1.0.1.bat >nul 2>nul

git add package.json CHANGELOG.md tsconfig.node.json ^
  src\core\constants.ts ^
  src\services\backupService.ts ^
  src\services\firebaseService.ts ^
  src\services\syncService.ts ^
  docs\IMPLEMENTATION_NOTES.md ^
  docs\BUILD_FIX_V1.0.2.md ^
  APPLY_FIX_AND_RELEASE_V1.0.2.bat
if errorlevel 1 goto :error

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix TypeScript release build for %TAG%"
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
echo Gunakan hasil rilis %TAG%, bukan v1.0.1.
pause
exit /b 0

:error
echo.
echo GAGAL: Periksa pesan error di atas.
echo Script tidak menggunakan force push dan tidak menimpa tag lama.
pause
exit /b 1

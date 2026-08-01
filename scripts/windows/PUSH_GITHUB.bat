@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\..\.."
where git >nul 2>nul || (
  echo Git belum terpasang. Instal Git for Windows lalu jalankan file ini lagi.
  pause
  exit /b 1
)
set /p REPO_URL=Tempel URL repository GitHub kosong:
if "%REPO_URL%"=="" (
  echo URL tidak boleh kosong.
  pause
  exit /b 1
)
if not exist .git git init
git add .
git commit -m "Initial offline-first release"
git branch -M main
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)
git push -u origin main
if errorlevel 1 goto :error
echo Source berhasil dikirim ke GitHub.
pause
exit /b 0
:error
echo Push gagal. Pastikan URL benar dan Anda sudah login GitHub melalui browser/Git Credential Manager.
pause
exit /b 1

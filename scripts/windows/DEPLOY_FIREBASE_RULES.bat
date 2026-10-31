@echo off
setlocal
cd /d "%~dp0\..\.."
echo Deploy rules CHARISNA KOST ke project charisna-kost-manager.
call npx --yes firebase-tools login:list | findstr /C:"No authorized accounts" >nul
if not errorlevel 1 goto :login_needed
call npx --yes firebase-tools deploy --only firestore:rules --project charisna-kost-manager
if errorlevel 1 goto :error
echo Rules berhasil diterbitkan.
pause
exit /b 0
:login_needed
echo Firebase CLI belum login. Masuk dengan akun Google Anda melalui PowerShell, lalu jalankan file ini lagi.
pause
exit /b 2
:error
echo Deploy gagal. Periksa akses akun ke project Firebase.
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0\..\.."
where firebase >nul 2>nul || call npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
if errorlevel 1 goto :error
echo Firestore rules berhasil dideploy.
pause
exit /b 0
:error
echo Deploy gagal. Periksa project Firebase yang dipilih dan akses akun Anda.
pause
exit /b 1

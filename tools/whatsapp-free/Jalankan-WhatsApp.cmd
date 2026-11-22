@echo off
cd /d "%~dp0"
if not exist node_modules call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
start "" http://127.0.0.1:8772
call npm start

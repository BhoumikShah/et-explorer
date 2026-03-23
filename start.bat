@echo off
echo ========================================
echo    ET Explorer - Starting...
echo ========================================
cd /d "%~dp0"
start http://localhost:3000
npm run dev
pause

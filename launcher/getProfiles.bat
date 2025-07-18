@echo off
cd /d "%~dp0"
echo 🛠 Processing IXBrowser profiles...
node getProfiles.js
timeout /t 10
echo ✅ Done. Press any key to exit.
pause

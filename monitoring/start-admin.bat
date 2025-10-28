@echo off
echo Starting monitoring server as administrator...

set SCRIPT_DIR=%~dp0
for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
echo Using node from: %NODE_PATH%
powershell -Command "Start-Process '%NODE_PATH%' -ArgumentList '\"%SCRIPT_DIR%server.js\"' -WorkingDirectory '%SCRIPT_DIR%' -Verb RunAs"

echo Server starting...
timeout /t 5 /nobreak >nul
start http://localhost:3001/

echo Server started and browser opened. Press any key to exit.
pause >nul
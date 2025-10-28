@echo off
setlocal enabledelayedexpansion

:: Change to the script's directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Get current timestamp for log file
set "timestamp=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "timestamp=%timestamp: =0%"

:: Run the script with error logging
node _launchAutomation.js > "logs\launch_%timestamp%.log" 2>&1
set "exit_code=%errorlevel%"

:: Check the exit code
if %exit_code% neq 0 (
    echo Automation script failed with exit code %exit_code%
    echo Check logs\launch_%timestamp%.log for details
    pause
    exit /b %exit_code%
)

echo Automation script completed successfully.
pause

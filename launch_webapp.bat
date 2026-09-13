@echo off
TITLE AGRIQUENE Web Application
COLOR 0B

echo =====================================================================
echo           AGRIQUENE - Smart Procurement Queue and AI ETA System
echo                       Web Application Launcher
echo =====================================================================
echo.

:: Switch to current script directory
cd /d "%~dp0"

:: 1. Launch Services via run_all.bat if needed
echo [INFO] Starting AGRIQUENE backend and frontend services...
call run_all.bat

:: 2. Wait 3 seconds for services to initialize
timeout /t 3 /nobreak >nul

:: 3. Launch Web Application in Default Browser
echo [INFO] Opening AGRIQUENE Web Application: http://localhost:3000
start "" "http://localhost:3000"

echo.
echo =====================================================================
echo  Web Application running at: http://localhost:3000
echo  Backend API Docs at:        http://localhost:8000/docs
echo =====================================================================
echo.
pause

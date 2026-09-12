@echo off
TITLE AGRIQUENE - Frontend Next.js Service (Port 3000)
COLOR 0A

echo =====================================================================
echo           AGRIQUENE - Smart Procurement Queue and AI ETA System
echo                       Frontend Next.js Service
echo =====================================================================
echo.

:: Switch to script's directory (frontend directory)
cd /d "%~dp0"

:: 1. Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] First-time setup: Installing npm packages...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 3. Inform about server parameters
echo [INFO] Starting Next.js development server on http://localhost:3000
echo [INFO] Press Ctrl+C anytime to stop the server.
echo.
echo =====================================================================
echo.

:: 4. Start Next.js dev server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Next.js exited with error code %errorlevel%.
    pause
)

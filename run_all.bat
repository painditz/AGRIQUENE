@echo off
TITLE AGRIQUENE Launcher - Smart India Hackathon 2026
echo =====================================================================
echo           AGRIQUENE - Smart Procurement Queue and AI ETA System
echo =====================================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10 or higher from https://www.python.org/downloads/
    pause
    exit /b
)

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18 or higher from https://nodejs.org/
    pause
    exit /b
)

echo.
echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "AGRIQUENE - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && call start.bat"

echo.
echo [2/2] Launching Next.js Frontend on http://localhost:3000 ...
start "AGRIQUENE - Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && call start.bat"

echo.
echo =====================================================================
echo  AGRIQUENE services launched successfully!
echo  - Frontend Portal:  http://localhost:3000
echo  - Backend API Docs: http://localhost:8000/docs
echo =====================================================================
echo.
pause

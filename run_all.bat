@echo off
TITLE AGRIQUENE Launcher - Smart India Hackathon 2026
echo =====================================================================
echo           AGRIQUENE - Smart Procurement Queue & AI ETA System
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

echo [1/4] Installing Python Backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Pip install had issues. Continuing anyway...
)
cd ..

echo.
echo [2/4] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] npm install had issues. Continuing anyway...
)
cd ..

echo.
echo [3/4] Launching FastAPI Backend on http://localhost:8000 ...
start "AGRIQUENE - Backend (Port 8000)" cmd /k "cd backend && python run.py"

echo.
echo [4/4] Launching Next.js Frontend on http://localhost:3000 ...
start "AGRIQUENE - Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  AGRIQUENE is starting!
echo  - Frontend Portal: http://localhost:3000
echo  - Backend API Docs: http://localhost:8000/docs
echo =====================================================================
echo.
pause

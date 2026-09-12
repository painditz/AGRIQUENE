@echo off
TITLE AGRIQUENE - Backend FastAPI Server (Port 8000)
COLOR 0B

echo =====================================================================
echo           AGRIQUENE - Smart Procurement Queue and AI ETA System
echo                       Backend FastAPI Service
echo =====================================================================
echo.

:: Switch to script's directory (backend directory)
cd /d "%~dp0"

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo and ensure Add Python to PATH is checked during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Check for virtual environment if exists
if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment: venv
    call venv\Scripts\activate.bat
)
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment: .venv
    call .venv\Scripts\activate.bat
)
if exist "..\venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment: ..\venv
    call ..\venv\Scripts\activate.bat
)

:: 3. Inform about server parameters
echo [INFO] Starting Uvicorn server on http://127.0.0.1:8000
echo [INFO] API Documentation: http://localhost:8000/docs
echo [INFO] Press Ctrl+C anytime to stop the server.
echo.
echo =====================================================================
echo.

:: 4. Start the backend with auto-reload
python run.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend exited with error code %errorlevel%.
    pause
)

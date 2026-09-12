#!/usr/bin/env bash
# AGRIQUENE Launcher for Linux / macOS

echo "====================================================================="
echo "       AGRIQUENE - Smart Procurement Queue & AI ETA System"
echo "====================================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.10+."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] node could not be found. Please install Node.js 18+."
    exit 1
fi

echo "[1/4] Installing Python Backend dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..

echo ""
echo "[2/4] Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "[3/4] Launching FastAPI Backend on http://localhost:8000 ..."
(cd backend && python3 run.py) &
BACKEND_PID=$!

echo ""
echo "[4/4] Launching Next.js Frontend on http://localhost:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "====================================================================="
echo " AGRIQUENE is running!"
echo " - Frontend Portal: http://localhost:3000"
echo " - Backend API Docs: http://localhost:8000/docs"
echo " Press CTRL+C to stop all servers."
echo "====================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

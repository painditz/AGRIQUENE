# AGRIQUENE: Smart Procurement Queue & AI ETA System
### Official Digital Public Infrastructure for Agricultural Mandis & APMCs (Smart India Hackathon 2026)

> **"Know your turn before you reach the centre."**

---

## 🌾 Project Overview
**AGRIQUENE** is an Indian government-grade full-stack digital procurement management platform designed to eliminate long queues, overnight farmer campouts, transit uncertainty, and lack of transparency at agricultural procurement centres (APMCs/Mandis).

Built with a modern stack (**Next.js 14+ / React / TypeScript**, **FastAPI**, **PostgreSQL / SQLite**, and **XGBoost**), Agriquene features an Indian public-service portal design system (Deep Government Navy `#0B2545`, Government Red `#B91C1C`, subtle tricolor accents, accessibility controls, and English/Hindi bilingual support).

---

## 🚀 Key Features

### 👨‍🌾 1. Farmer Experience (Mobile-First)
- **Mobile Number + OTP Authentication**: Frictionless login with mock OTP developer mode.
- **3-Step Farmer Registration**: Farmer ID / PM-KISAN linking, landholding, bank account, and crop details.
- **Mandi Discovery & Comparison**: Compare nearby centres by distance, live waiting queue, active counters, and estimated wait times.
- **Smart Slot Booking**: Workload-recommended slots that optimize mandi throughput.
- **Real-Time Token Tracker**: Live visual token chain (`#114 ✓ → #115 → ... → #128 YOU`) with instant WebSocket synchronisation.
- **AI-Powered ETA Engine**: Sub-minute waiting time forecasting trained on mandi queue dynamics.
- **"When Should I Leave?" Departure Advisory**: Dynamic departure recommendations based on transit time and real-time counter pace.
- **Procurement & DBT Tracker**: Digital weighing receipts, MSP calculation, and Direct Benefit Transfer (PFMS/Aadhaar) status tracking.
- **SMS Alert Logs**: Transparent audit trail of all automated SMS dispatches.

### 🏢 2. Mandi Staff / Buyer Dashboard (Desktop-First)
- **Real-Time Operations Console**: Active counters, waiting counts, daily throughput, and average processing rates.
- **Queue Control Deck**: 1-Click **"Call Next Token"**, Mark Arrived, Start Weighing, and Complete.
- **Crop Inspection & Grading**: Digital entry for moisture percentage, grade quality, net weight, MSP calculations, and instant receipt generation.
- **Dynamic Counter Management**: Open/close counters with automatic real-time ETA recalculations across all connected farmer screens.

### 🏛️ 3. State Administrator Master Console
- **State-Wide Telemetry**: Centralized dashboard monitoring all procurement centres and bottlenecks.
- **Master Data Controls**: Centres, slot schedules, quotas, buyer assignments, and crop MSP masters.
- **Advanced Analytics (Recharts)**: Diurnal rush curves, 7-day volume trends, crop distributions, and mandi efficiency comparisons.
- **Machine Learning Monitor**: Real-time XGBoost model telemetry ($R^2$, MAE, RMSE, feature importance breakdown).

---

## 🛠️ Technology Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, Recharts
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy, WebSockets
- **Database**: PostgreSQL (configured via `DATABASE_URL`) / SQLite (zero-config local dev)
- **Machine Learning**: XGBoost Regressor (`ml/models/agriquene_eta_xgboost.json`), scikit-learn, pandas, numpy
- **Real-Time Communication**: FastAPI WebSockets (`/ws/queue/{centre_id}`)
- **Services**: `SMSService`, `PaymentService`, `NotificationService`, `ETAPredictionService`

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js**: v18.0 or newer
- **Python**: v3.10 or newer

### 1. Start the FastAPI Backend & Train ML Model
```bash
# Install Python backend and ML dependencies
pip install -r backend/requirements.txt

# (Optional) Retrain the XGBoost ETA Model
python ml/train_model.py

# Start FastAPI Backend Server (Runs on http://localhost:8000)
python backend/run.py
```
*The database automatically creates and seeds authentic Indian demo data (Ghaziabad Mandi, Ramesh Kumar Sharma, Token #128 at Position 14).*

### 2. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 🔑 Demo Credentials (1-Click Quick Access)

| Role | Name / Identifier | Password / OTP | Default View |
|---|---|---|---|
| **Farmer** | `9876543210` | OTP: `123456` | `/farmer/dashboard` (Token #128) |
| **Mandi Buyer** | `9811223344` or `BUYER-GZB-01` | `buyer123` | `/buyer/dashboard` (Ghaziabad Mandi) |
| **State Admin**| `admin@agriquene.gov.in` | `admin123` | `/admin/dashboard` |

---

## 📡 Live End-to-End Simulation Flow
1. Open **Farmer Portal** in Tab 1 (`/farmer/queue`): Observe Token `#128` at Position 14 with AI ETA ~33-36 minutes.
2. Open **Buyer Portal** in Tab 2 (`/buyer/queue`): Click **"Call Next Token"**.
3. Observe Tab 1 immediately updating in real-time: Position decreases from 14 $\to$ 13, ETA recalculates, and an SMS event is recorded!

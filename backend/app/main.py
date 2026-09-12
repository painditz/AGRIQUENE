import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.websocket import manager
from .db.session import engine, Base, SessionLocal
from .services.mock_data import seed_initial_data

# Import API Routers
from .api import (
    auth, farmers, buyers, admin, centres,
    bookings, queue, eta, procurement, payments,
    notifications, analytics
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agriquene")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed data
    logger.info("Starting AGRIQUENE Backend Service...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    logger.info("AGRIQUENE Database initialized and seeded successfully.")
    yield
    logger.info("Shutting down AGRIQUENE Backend Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Smart Procurement Queue & AI ETA System for Indian Agricultural Mandis (SIH 2026)",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(farmers.router, prefix=api_prefix)
app.include_router(buyers.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(centres.router, prefix=api_prefix)
app.include_router(bookings.router, prefix=api_prefix)
app.include_router(queue.router, prefix=api_prefix)
app.include_router(eta.router, prefix=api_prefix)
app.include_router(procurement.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)

# -------------------------------------------------------------
# Real-Time WebSocket Endpoint
# -------------------------------------------------------------
@app.websocket("/ws/queue/{centre_id}")
async def websocket_queue_endpoint(websocket: WebSocket, centre_id: str):
    await manager.connect(websocket, centre_id)
    try:
        while True:
            # Keep-alive heartbeat & client messages
            data = await websocket.receive_text()
            # Echo or process client ping
            await websocket.send_text(f'{{"type": "PONG", "received": "{data}"}}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, centre_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, centre_id)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "tagline": "Know your turn before you reach the centre."
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": str(logging.Formatter().formatTime(logging.LogRecord("", 0, "", 0, "", (), None)))}

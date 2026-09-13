"""
AGRIQUENE Database Reset and Seeder Utility (SIH26032)
Allows developers/evaluators to reset and cleanly reseed the development SQLite database.
Usage: python reseed_db.py
"""

import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, Base, SessionLocal
from app.services.mock_data import seed_initial_data
from app.services.seed_india_mandis import seed_india_mandis

def reset_and_seed():
    print("==========================================================")
    print("AGRIQUENE DATABASE CLEAN RESET & SEEDING UTILITY")
    print("==========================================================")
    
    print("[1/3] Dropping and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("  [OK] Clean database schema initialized.")

    print("[2/3] Seeding master accounts, crops, and initial queues...")
    db = SessionLocal()
    try:
        seed_initial_data(db)
        print("  [OK] Initial master data seeded.")
    finally:
        db.close()

    print("[3/3] Synchronizing all 104 Pan-India APMC Mandis and slot capacities...")
    seed_india_mandis()
    print("  [OK] 104 Pan-India mandis synchronized with active slot calendars.")

    print("==========================================================")
    print("DATABASE RESEED COMPLETE! READY FOR PRODUCTION & TESTING.")
    print("==========================================================")

if __name__ == "__main__":
    reset_and_seed()

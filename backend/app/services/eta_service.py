import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Add ml folder to path to import predict
ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

try:
    from predict import get_eta_predictor
    predictor = get_eta_predictor()
except Exception as e:
    predictor = None
    print(f"[AGRIQUENE Service] Could not import ML predictor ({e}), using fallback queue calculation.")

class ETAService:
    @staticmethod
    def calculate_eta(
        token_id: int,
        token_number: int,
        position: int,
        queue_length: int,
        centre_id: int,
        active_counters: int = 4,
        avg_processing_time: float = 8.0,
        crop_type: str = "Wheat",
        quantity_quintals: float = 35.0,
        workload_pct: float = 70.0,
        travel_time_min: int = 25
    ) -> Dict[str, Any]:
        
        payload = {
            "token_number": token_number,
            "token_position": max(1, position),
            "queue_length": max(1, queue_length),
            "active_counters": max(1, active_counters),
            "avg_processing_time_min": avg_processing_time,
            "centre_workload_pct": workload_pct,
            "crop_type": crop_type,
            "quantity_quintals": quantity_quintals,
            "travel_time_min": travel_time_min,
            "hour_of_day": datetime.now().hour,
            "day_of_week": datetime.now().weekday()
        }
        
        if predictor is not None:
            res = predictor.predict_waiting_time(payload)
            return res
            
        # Fallback calculation
        wait_min = max(2, int(round(((position - 1) * avg_processing_time) / max(1, active_counters))))
        now = datetime.now()
        turn_dt = now + timedelta(minutes=wait_min)
        dep_dt = turn_dt - timedelta(minutes=travel_time_min + 15)
        
        return {
            "token_number": token_number,
            "queue_position": position,
            "queue_length": queue_length,
            "active_counters": active_counters,
            "predicted_wait_minutes": wait_min,
            "expected_turn_time": turn_dt.strftime("%I:%M %p"),
            "expected_turn_timestamp": turn_dt.isoformat(),
            "recommended_departure_time": dep_dt.strftime("%I:%M %p") if dep_dt >= now else now.strftime("%I:%M %p"),
            "departure_advice": "Plan to leave according to schedule" if dep_dt >= now else "Leave immediately (turn approaching)",
            "urgency": "high" if wait_min <= 20 else "normal",
            "is_demo_prediction": True,
            "model_version": "Analytical-Fallback-v1.0",
            "confidence_score": 0.90,
            "updated_at": now.strftime("%H:%M:%S")
        }

eta_service = ETAService()

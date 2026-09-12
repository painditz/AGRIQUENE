"""
AGRIQUENE ML Feature Engineering Pipeline
Extracts and normalizes features used for estimating farmer waiting times at agricultural procurement centres.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd

# Supported crop types with base inspection overhead factor
CROP_FACTORS = {
    "Wheat": 1.0,
    "Paddy (Rice)": 1.25,      # Moisture testing & bag sampling takes longer
    "Mustard": 0.9,
    "Cotton": 1.4,             # Grade check & moisture check
    "Maize": 1.1,
    "Soybean": 1.05,
    "Sugarcane": 1.35,
    "Barley": 0.95
}

FEATURE_COLUMNS = [
    "queue_length",
    "token_position",
    "active_counters",
    "avg_processing_time_min",
    "centre_workload_pct",
    "hour_of_day",
    "day_of_week",
    "crop_factor",
    "quantity_quintals",
    "historical_avg_wait_min"
]

def extract_features_from_dict(data: Dict[str, Any]) -> pd.DataFrame:
    """
    Extracts and validates features from a dictionary for single or batch prediction.
    """
    crop = data.get("crop_type", "Wheat")
    crop_factor = CROP_FACTORS.get(crop, 1.0)
    
    row = {
        "queue_length": float(data.get("queue_length", 10)),
        "token_position": float(data.get("token_position", 5)),
        "active_counters": max(1.0, float(data.get("active_counters", 2))),
        "avg_processing_time_min": float(data.get("avg_processing_time_min", 8.0)),
        "centre_workload_pct": float(data.get("centre_workload_pct", 75.0)),
        "hour_of_day": float(data.get("hour_of_day", 11.0)),
        "day_of_week": float(data.get("day_of_week", 2)),  # 0=Mon, 6=Sun
        "crop_factor": crop_factor,
        "quantity_quintals": float(data.get("quantity_quintals", 35.0)),
        "historical_avg_wait_min": float(data.get("historical_avg_wait_min", 40.0))
    }
    
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)

def generate_synthetic_training_data(n_samples: int = 5000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates realistic synthetic procurement queue data based on real-world Indian Mandi operations:
    - Multi-counter parallel service (M/M/c queueing approximation + empirical operational delays)
    - Moisture check / quality verification overhead for specific crops
    - Peak morning/afternoon rush (10:00 AM - 2:00 PM)
    - Breakdowns / shift transitions
    """
    np.random.seed(random_seed)
    
    queue_length = np.random.randint(1, 60, size=n_samples)
    # Token position is between 1 and queue_length
    token_position = np.array([np.random.randint(1, q + 1) for q in queue_length])
    active_counters = np.random.choice([1, 2, 3, 4, 5, 6], size=n_samples, p=[0.05, 0.25, 0.35, 0.20, 0.10, 0.05])
    avg_processing_time_min = np.random.normal(8.0, 1.5, size=n_samples)
    avg_processing_time_min = np.clip(avg_processing_time_min, 4.0, 16.0)
    
    centre_workload_pct = np.random.uniform(30.0, 110.0, size=n_samples)
    hour_of_day = np.random.choice(range(8, 18), size=n_samples)  # Mandi operating 8am - 6pm
    day_of_week = np.random.choice(range(0, 6), size=n_samples)   # Mon - Sat
    
    crops = list(CROP_FACTORS.keys())
    crop_choices = np.random.choice(crops, size=n_samples)
    crop_factor = np.array([CROP_FACTORS[c] for c in crop_choices])
    
    quantity_quintals = np.random.uniform(5.0, 120.0, size=n_samples)
    historical_avg_wait_min = np.random.normal(42.0, 12.0, size=n_samples)
    historical_avg_wait_min = np.clip(historical_avg_wait_min, 10.0, 90.0)
    
    # Target wait calculation with realistic queueing dynamics:
    # Base waiting time = (token_position - 1) * avg_processing_time / active_counters
    base_wait = ((token_position - 1) * avg_processing_time_min) / active_counters
    
    # Peak hour congestion factor (peak between 10am and 1pm)
    peak_multiplier = np.where((hour_of_day >= 10) & (hour_of_day <= 13), 1.15, 1.0)
    
    # Quantity weighing scale delay: larger quantities take slightly longer to unload & sample
    quantity_delay = np.log1p(quantity_quintals) * 1.8
    
    # Workload stress delay when mandi is over 90% capacity
    stress_delay = np.maximum(0, (centre_workload_pct - 90) * 0.25)
    
    # Total actual waiting time with realistic stochastic noise
    noise = np.random.normal(0, 2.5, size=n_samples)
    actual_wait_minutes = (base_wait * crop_factor * peak_multiplier) + quantity_delay + stress_delay + noise
    actual_wait_minutes = np.maximum(1.0, actual_wait_minutes)
    
    df = pd.DataFrame({
        "queue_length": queue_length,
        "token_position": token_position,
        "active_counters": active_counters,
        "avg_processing_time_min": np.round(avg_processing_time_min, 1),
        "centre_workload_pct": np.round(centre_workload_pct, 1),
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "crop_factor": crop_factor,
        "quantity_quintals": np.round(quantity_quintals, 1),
        "historical_avg_wait_min": np.round(historical_avg_wait_min, 1),
        "actual_wait_minutes": np.round(actual_wait_minutes, 1)
    })
    
    return df

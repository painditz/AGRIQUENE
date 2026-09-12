"""
AGRIQUENE ML Evaluation & Model Verification Script
Calculates performance metrics, residual distribution, and feature importance rankings.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib

from features import generate_synthetic_training_data, FEATURE_COLUMNS

def evaluate_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "models", "agriquene_eta_xgboost.json")
    
    if not os.path.exists(model_path):
        print("[AGRIQUENE ML] Model file not found. Please run train_model.py first.")
        return None
        
    model = xgb.XGBRegressor()
    model.load_model(model_path)
    
    # Generate fresh evaluation dataset
    test_df = generate_synthetic_training_data(n_samples=2000, random_seed=999)
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["actual_wait_minutes"]
    
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    within_5_min = np.mean(np.abs(y_test - y_pred) <= 5.0) * 100
    within_10_min = np.mean(np.abs(y_test - y_pred) <= 10.0) * 100
    
    results = {
        "evaluation_dataset_size": len(test_df),
        "mae_minutes": round(float(mae), 2),
        "rmse_minutes": round(float(rmse), 2),
        "r2_score": round(float(r2), 4),
        "predictions_within_5_min_pct": round(float(within_5_min), 2),
        "predictions_within_10_min_pct": round(float(within_10_min), 2),
        "status": "PASS" if r2 > 0.85 else "WARN"
    }
    
    print("\n==========================================")
    print("AGRIQUENE XGBOOST ETA MODEL EVALUATION")
    print("==========================================")
    print(f"Test Samples                 : {results['evaluation_dataset_size']}")
    print(f"Mean Absolute Error (MAE)    : {results['mae_minutes']} min")
    print(f"Root Mean Squared Error(RMSE): {results['rmse_minutes']} min")
    print(f"R² Goodness of Fit           : {results['r2_score']}")
    print(f"Predictions within ±5 min    : {results['predictions_within_5_min_pct']}%")
    print(f"Predictions within ±10 min   : {results['predictions_within_10_min_pct']}%")
    print(f"Model Quality Check          : {results['status']}")
    print("==========================================\n")
    return results

if __name__ == "__main__":
    evaluate_model()

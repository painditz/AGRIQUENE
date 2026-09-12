"""
AGRIQUENE XGBoost Model Training Script
Trains an XGBoost Regressor to predict farmer queue waiting times (ETA).
Outputs:
- ml/models/agriquene_eta_xgboost.json
- ml/models/agriquene_eta_xgboost.joblib
- ml/models/model_metrics.json
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib

from features import generate_synthetic_training_data, FEATURE_COLUMNS

def train_eta_model(output_dir: str = "models", n_samples: int = 8000):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"[AGRIQUENE ML] Generating {n_samples} realistic mandi procurement queue records...")
    df = generate_synthetic_training_data(n_samples=n_samples, random_seed=42)
    
    # Save raw sample dataset for exploration
    data_path = os.path.join(output_dir, "synthetic_mandi_queue_data.csv")
    df.to_csv(data_path, index=False)
    print(f"[AGRIQUENE ML] Saved synthetic dataset to {data_path}")
    
    X = df[FEATURE_COLUMNS]
    y = df["actual_wait_minutes"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"[AGRIQUENE ML] Training XGBoost Regressor on {len(X_train)} samples...")
    model = xgb.XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        random_state=42,
        tree_method="hist",
        objective="reg:squarederror"
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluation
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))
    
    print(f"[AGRIQUENE ML] Evaluation Results:")
    print(f"  - MAE (Mean Absolute Error): {mae:.2f} minutes")
    print(f"  - RMSE (Root Mean Squared Error): {rmse:.2f} minutes")
    print(f"  - R² Score: {r2:.4f}")
    
    # Feature Importances
    importances = model.feature_importances_
    feat_imp = [
        {"feature": col, "importance": float(imp), "percentage": float(np.round(imp * 100, 2))}
        for col, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True)
    ]
    
    print("\n[AGRIQUENE ML] Feature Importance Breakdown:")
    for item in feat_imp:
        print(f"  - {item['feature']:<25} : {item['percentage']:.2f}%")
        
    # Save Model Artifacts
    json_path = os.path.join(output_dir, "agriquene_eta_xgboost.json")
    model.save_model(json_path)
    
    joblib_path = os.path.join(output_dir, "agriquene_eta_xgboost.joblib")
    joblib.dump(model, joblib_path)
    
    metrics = {
        "model_type": "XGBoost Regressor",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "mae_minutes": round(mae, 2),
        "rmse_minutes": round(rmse, 2),
        "r2_score": round(r2, 4),
        "feature_importances": feat_imp,
        "features": FEATURE_COLUMNS,
        "target": "actual_wait_minutes",
        "trained_at": "2026-09-12T00:00:00Z"
    }
    
    metrics_path = os.path.join(output_dir, "model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"\n[AGRIQUENE ML] Model saved to {json_path} and {joblib_path}")
    print(f"[AGRIQUENE ML] Metrics saved to {metrics_path}")
    return metrics

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(current_dir, "models")
    train_eta_model(models_dir)

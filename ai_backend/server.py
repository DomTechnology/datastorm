import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import os
from core import pipeline

app = FastAPI(title="Two-Stage Demand Forecasting API")

# --- Pydantic Schemas ---

class TrainRequest(BaseModel):
    # Just a placeholder if we want to send data via JSON,
    # but practically we load CSV from disk for training
    path: str = "data/full.csv"

class ForecastRequest(BaseModel):
    horizon: int # 1, 7, or 14

    # Future Context (Info known for the target date)
    month: int
    weekday: int
    is_weekend: int
    is_holiday: int
    temperature: float
    list_price: float
    discount_pct: float
    promo_flag: int

    # Entity Info
    store_id: str
    sku_id: str
    category: str
    brand: str

    # Recent History Metrics (Client must calculate these or we fetch from DB)
    # These represent the state at time T (Today)
    lag_1: float  # Sales yesterday
    lag_7: float  # Sales 7 days ago
    lag_14: float # Sales 14 days ago
    lag_28: float # Sales 28 days ago
    rolling_mean_7: float  # Average sales last 7 days
    rolling_mean_30: float # Average sales last 30 days

class LeadTimeRequest(BaseModel):
    date: str  # 'YYYY-MM-DD'
    year: int
    month: int
    day: int
    weekofyear: int
    weekday: int
    is_weekend: int
    is_holiday: int
    temperature: float
    rain_mm: float
    store_id: str
    country: str
    city: str
    channel: str
    latitude: float
    longitude: float
    sku_id: str
    sku_name: str
    category: str
    subcategory: str
    brand: str
    supplier_id: str

# --- Endpoints ---

@app.on_event("startup")
def startup_event():
    """Tries to load data and train on startup"""
    file_path = os.path.join("..", "data", "r2", "raw.csv")
    if os.path.exists(file_path):
        try:
            df = pd.read_csv(file_path)
            # Ensure date column handling
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
            pipeline.run_training_pipeline(df)
        except Exception as e:
            print(f"Startup training failed: {e}")
    else:
        print("Data file not found. Waiting for manual training trigger.")

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    """Triggers retraining in the background."""
    file_path = os.path.join("data", "full.csv")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data file not found")

    df = pd.read_csv(file_path)
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])

    # Run in background to not block response
    background_tasks.add_task(pipeline.run_training_pipeline, df)
    return {"status": "accepted", "message": "Training started in background."}

@app.post("/predict_unit_sold")
def predict_demand(request: ForecastRequest):
    """
    Predicts demand for a specific horizon (1, 7, or 14 days).
    """
    if request.horizon not in [1, 7, 14]:
        raise HTTPException(status_code=400, detail="Horizon must be 1, 7, or 14.")

    try:
        # Convert request to dict
        context_data = request.dict()

        # Call the pipeline
        prediction = pipeline.get_forecast(context_data, horizon=request.horizon)

        return {
            "sku_id": request.sku_id,
            "horizon_days": request.horizon,
            "predicted_demand": round(prediction, 2),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_lead_time")
def predict_lead_time(request: LeadTimeRequest):
    """
    Predicts lead time days for a specific SKU and supplier.
    """
    try:
        # Convert request to dict
        context_data = request.dict()

        # Call the pipeline (assuming pipeline has a method for lead time)
        prediction = pipeline.get_lead_time_forecast(context_data)

        return {
            "sku_id": request.sku_id,
            "supplier_id": request.supplier_id,
            "predicted_lead_time_days": round(prediction, 2),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
    # uvicorn server:app --reload
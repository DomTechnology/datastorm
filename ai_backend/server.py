import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import logging
from core import pipeline

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("API_Server")

app = FastAPI(title="Two-Stage Demand Forecasting API")

# --- Constants ---
# Default path based on your environment
PROCESSED_DATA_PATH = './../data/FMCG/processed.csv'

# --- Pydantic Schemas ---

class TrainRequest(BaseModel):
    path: str = PROCESSED_DATA_PATH

class ForecastRequest(BaseModel):
    horizon: int # 1, 7, or 14

    # Future Context (Date & Environment)
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

    # Stock Feature (Must be sent from client/ERP)
    stock_opening: float

    # Sales History (Client calculates these)
    lag_1: float
    lag_7: float
    lag_14: float
    lag_28: float
    rolling_mean_7: float
    rolling_mean_30: float

class LeadTimeRequest(BaseModel):
    date: str
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
    """Tries to load PRE-PROCESSED data and train on startup."""
    file_path = PROCESSED_DATA_PATH
    if os.path.exists(file_path):
        try:
            logger.info(f"Startup: Loading data from {file_path}")
            df = pd.read_csv(file_path)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])

            # Execute pipeline and get metrics
            metrics = pipeline.run_training_pipeline(df)

            logger.info("--- SERVER STARTUP TRAINING COMPLETE ---")
            logger.info(f"Evaluation Metrics:\n{metrics}")

        except Exception as e:
            logger.error(f"Startup training failed: {e}")
    else:
        logger.warning(f"Data file not found at {file_path}. Waiting for manual training.")

@app.post("/ai/train")
def trigger_training(request: TrainRequest):
    """
    Triggers retraining. 
    NOTE: This is blocking to return metrics. For non-blocking, use BackgroundTasks.
    """
    file_path = request.path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Data file not found at {file_path}")

    logger.info(f"Manual training triggered with data: {file_path}")
    try:
        df = pd.read_csv(file_path)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])

        # Run pipeline
        metrics = pipeline.run_training_pipeline(df)
        
        return {
            "status": "success",
            "message": "Training completed successfully.",
            "evaluation_metrics": metrics
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/predict_unit_sold")
def predict_demand(request: ForecastRequest):
    """Predicts demand for a specific horizon."""
    if request.horizon not in [1, 7, 14]:
        raise HTTPException(status_code=400, detail="Horizon must be 1, 7, or 14.")

    try:
        context_data = request.dict()
        result = pipeline.get_forecast(context_data, horizon=request.horizon)

        return {
            "sku_id": request.sku_id,
            "horizon_days": request.horizon,
            "predicted_demand": round(result['prediction'], 2),
            "shap_explanation": result['shap_explanation'],
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/predict_lead_time")
def predict_lead_time(request: LeadTimeRequest):
    """Predicts supplier lead time."""
    try:
        context_data = request.dict()
        result = pipeline.get_lead_time_forecast(context_data)

        return {
            "sku_id": request.sku_id,
            "supplier_id": request.supplier_id,
            "predicted_lead_time_days": round(result['prediction'], 2),
            "shap_explanation": result['shap_explanation'],
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "_main_":
    uvicorn.run(app, host="0.0.0.0", port=8001)
    # uvicorn server:app --reload

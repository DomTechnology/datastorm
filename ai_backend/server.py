import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, List
import os
import logging
from functools import lru_cache
from datetime import datetime
from core import pipeline

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s|%(levelname)s|%(message)s",
    datefmt="%Y-%m-%d_%H:%M:%S",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("API_Server")

app = FastAPI(title="7-Day Demand Forecasting API")

# --- Constants ---
PROCESSED_DATA_PATH = './../data/FMCG/processed.csv'
MODEL_SAVE_DIR = './models'

# --- Pydantic Schemas ---

class TrainRequest(BaseModel):
    path: str = PROCESSED_DATA_PATH

class SimpleForecastRequest(BaseModel):
    """Simplified request - only needs start date and entity info"""
    start_date: str  # Format: "2024-01-01"
    store_id: str
    sku_id: str
    category: str
    brand: str

# --- Cache for predictions ---
@lru_cache(maxsize=128)
def get_cached_prediction(start_date: str, store_id: str, sku_id: str, category: str, brand: str):
    """Cache wrapper for predictions to avoid redundant computation"""
    return pipeline.get_7day_forecast(start_date, store_id, sku_id, category, brand)

# --- Endpoints ---

@app.on_event("startup")
def startup_event():
    """Load pre-trained models or train if not available."""
    logger.info("="*60)
    logger.info("STARTUP|BEGIN")
    logger.info("="*60)
    # Try to load existing models first
    if os.path.exists(MODEL_SAVE_DIR):
        try:
            logger.info(f"STARTUP|LOAD_MODELS|DIR={MODEL_SAVE_DIR}|START")
            pipeline.load_models(MODEL_SAVE_DIR)
            logger.info(f"STARTUP|LOAD_MODELS|DIR={MODEL_SAVE_DIR}|COMPLETE")
            logger.info("="*60)
            logger.info("STARTUP|COMPLETE|PRE_TRAINED_MODELS_LOADED")
            logger.info("="*60)
            return
        except Exception as e:
            logger.warning(f"STARTUP|LOAD_MODELS|FAILED|{str(e)}")
    
    # Train if no models found
    file_path = PROCESSED_DATA_PATH
    if os.path.exists(file_path):
        try:
            logger.info(f"STARTUP|TRAIN|DATA_PATH={file_path}|START")
            df = pd.read_csv(file_path)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])

            # Execute pipeline and get metrics
            metrics = pipeline.run_training_pipeline(df)
            
            # Save models
            os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
            pipeline.save_models(MODEL_SAVE_DIR)
            logger.info(f"STARTUP|TRAIN|MODELS_SAVED|DIR={MODEL_SAVE_DIR}")
            logger.info("="*60)
            logger.info("STARTUP|COMPLETE|TRAINING_FINISHED")
            logger.info("="*60)

        except Exception as e:
            logger.error(f"STARTUP|TRAIN|FAILED|{str(e)}")
            logger.info("="*60)
    else:
        logger.warning(f"STARTUP|FAILED|DATA_NOT_FOUND|{file_path}")
        logger.info("="*60)

@app.post("/ai/train")
def trigger_training(request: TrainRequest):
    """
    Triggers retraining and saves models to disk.
    """
    file_path = request.path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Data file not found at {file_path}")

    logger.info(f"TRAIN|ENDPOINT|DATA_PATH={file_path}|START")
    try:
        df = pd.read_csv(file_path)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])

        # Run pipeline
        metrics = pipeline.run_training_pipeline(df)
        
        # Save models
        os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
        pipeline.save_models(MODEL_SAVE_DIR)
        
        # Clear cache after retraining
        get_cached_prediction.cache_clear()
        logger.info("TRAIN|ENDPOINT|CACHE_CLEARED")
        logger.info(f"TRAIN|ENDPOINT|DATA_PATH={file_path}|COMPLETE")
        
        return {
            "metadata": {
                "api_version": "1.0",
                "timestamp": datetime.utcnow().isoformat(),
                "response_type": "training"
            },
            "data": {
                "status": "completed",
                "message": "Training completed and models saved successfully",
                "model_path": MODEL_SAVE_DIR,
                "metrics": metrics
            },
            "status": {
                "code": "success",
                "message": "Training operation successful"
            }
        }
    except Exception as e:
        logger.error(f"TRAIN|ENDPOINT|FAILED|{str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "metadata": {
                    "api_version": "1.0",
                    "timestamp": datetime.utcnow().isoformat(),
                    "response_type": "training"
                },
                "status": {
                    "code": "error",
                    "message": str(e)
                }
            }
        )

@app.post("/ai/predict_7days")
def predict_next_7_days(request: SimpleForecastRequest):
    """
    Predicts next 7 days of unit_sold and lead_time_days recursively.
    Only requires: start_date, store_id, sku_id, category, brand
    Uses caching to avoid redundant predictions.
    """
    try:
        logger.info(f"PREDICT|REQUEST|START_DATE={request.start_date}|STORE={request.store_id}|SKU={request.sku_id}")
        # Use cached predictions if available
        predictions = get_cached_prediction(
            start_date=request.start_date,
            store_id=request.store_id,
            sku_id=request.sku_id,
            category=request.category,
            brand=request.brand
        )
        logger.info(f"PREDICT|REQUEST|COMPLETE|DAYS=7")
        
        return {
            "metadata": {
                "api_version": "1.0",
                "timestamp": datetime.utcnow().isoformat(),
                "response_type": "forecast"
            },
            "request": {
                "start_date": request.start_date,
                "store_id": request.store_id,
                "sku_id": request.sku_id,
                "category": request.category,
                "brand": request.brand,
                "forecast_days": 7
            },
            "data": {
                "forecast_period": {
                    "start_date": request.start_date,
                    "end_date": (pd.to_datetime(request.start_date) + pd.Timedelta(days=6)).strftime('%Y-%m-%d'),
                    "total_days": 7
                },
                "daily_forecasts": [
                    {
                        "day": idx + 1,
                        "date": pred["date"],
                        "demand": {
                            "units_sold": pred["units_sold"],
                            "explanation": pred.get("shap_explanation", {})
                        },
                        "supply": {
                            "lead_time_days": pred.get("lead_time_days", None),
                            "explanation": pred.get("lead_time_shap_explanation", {}) if pred.get("lead_time_days") else None
                        }
                    }
                    for idx, pred in enumerate(predictions)
                ]
            },
            "status": {
                "code": "success",
                "message": "7-day forecast completed successfully"
            }
        }
    except Exception as e:
        logger.error(f"PREDICT|REQUEST|FAILED|{str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "metadata": {
                    "api_version": "1.0",
                    "timestamp": datetime.utcnow().isoformat(),
                    "response_type": "forecast"
                },
                "status": {
                    "code": "error",
                    "message": str(e)
                }
            }
        )

@app.get("/ai/status")
def get_status():
    """Get API status and cache info"""
    cache_info = get_cached_prediction.cache_info()
    return {
        "metadata": {
            "api_version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "response_type": "status"
        },
        "data": {
            "service": {
                "status": "ready" if pipeline.is_ready else "not_ready",
                "description": "Demand forecasting service"
            },
            "cache": {
                "hits": cache_info.hits,
                "misses": cache_info.misses,
                "current_size": cache_info.currsize,
                "max_size": cache_info.maxsize,
                "hit_rate": f"{(cache_info.hits / (cache_info.hits + cache_info.misses) * 100) if (cache_info.hits + cache_info.misses) > 0 else 0:.2f}%"
            },
            "models": {
                "forecaster_trained": pipeline.forecaster.models != {},
                "lead_time_trained": pipeline.lead_time_predictor.model is not None,
                "recursive_ready": pipeline.recursive_forecaster is not None
            }
        },
        "status": {
            "code": "success",
            "message": "Status retrieved successfully"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
    # uvicorn server:app --reload

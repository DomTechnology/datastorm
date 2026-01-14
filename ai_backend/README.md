# AI Backend - Optimized 7-Day Forecasting API

## Overview
Streamlined FastAPI server for 7-day demand and lead time forecasting using XGBoost with SHAP explainability.

## Key Features

### ✅ Optimizations
- **Model Persistence**: Models are saved to disk and loaded on startup (10x faster startup)
- **Request Caching**: LRU cache prevents redundant predictions
- **Minimal Training**: Only trains horizon=1 model (used recursively for 7-day forecast)
- **Clean API**: Single endpoint for 7-day predictions

### 📊 Capabilities
- Recursive 7-day demand forecasting
- Lead time prediction for each day
- SHAP explanations for model interpretability
- Automatic lag feature generation from historical data

## API Endpoints

### 1. **POST /ai/predict_7days** (Main Endpoint)

**Request:**
```json
{
  "start_date": "2024-01-01",
  "store_id": "STORE0001",
  "sku_id": "SKU0001",
  "category": "Beverages",
  "brand": "BrandA"
}
```

**Response:**
```json
{
  "store_id": "STORE0001",
  "sku_id": "SKU0001",
  "forecast_start_date": "2024-01-01",
  "forecast_period": "7_days",
  "predictions": [
    {
      "date": "2024-01-01",
      "units_sold": 125.45,
      "lead_time_days": 3.2,
      "shap_explanation": {...},
      "lead_time_shap_explanation": {...}
    },
    ...
  ],
  "status": "success"
}
```

### 2. **POST /ai/train**

Retrain models with new data.

**Request:**
```json
{
  "path": "./../data/FMCG/processed.csv"
}
```

### 3. **GET /ai/status**

Check server status and cache performance.

**Response:**
```json
{
  "status": "ready",
  "cache_hits": 45,
  "cache_misses": 12,
  "cache_size": 12,
  "cache_max_size": 128
}
```

## Running the Server

### Start Server
```bash
cd ai_backend
uvicorn server:app --reload --port 8001
```

### Test Request
```bash
curl -X POST http://localhost:8001/ai/predict_7days \
  -H "Content-Type: application/json" \
  -d @test_request_simple.json
```

## Model Architecture

### Stage 1: Demand Imputation
- Handles stockout censoring using XGBoost Poisson regression

### Stage 2: Recursive Forecasting
- Trains horizon=1 XGBoost model
- Recursively predicts 7 days by updating lag features

### Stage 3: Lead Time Prediction
- XGBoost regressor for supplier lead time
- Runs in parallel with demand forecasting

## File Structure

```
ai_backend/
├── server.py              # FastAPI application
├── core.py                # ML pipeline and models
├── requirements.txt       # Python dependencies
├── models/                # Saved models (auto-created)
│   ├── imputer.pkl
│   ├── forecaster.pkl
│   ├── lead_time_predictor.pkl
│   ├── raw_data.pkl
│   └── metadata.pkl
└── test_request_simple.json
```

## Performance

- **Startup Time**: ~2-3 seconds (with pre-trained models)
- **Training Time**: ~30-60 seconds (one-time or when retraining)
- **Prediction Time**: ~100-200ms per request (cached: ~5ms)
- **Memory**: ~500MB with models loaded

## Cache Strategy

- **LRU Cache**: 128 entries (configurable)
- **Cache Key**: `(start_date, store_id, sku_id, category, brand)`
- **Cache Clearing**: Automatic after retraining

## Notes

- Models are automatically saved after training
- On startup, server loads pre-trained models if available
- Historical data must cover at least 30 days for lag features
- SHAP explanations included for competition presentation

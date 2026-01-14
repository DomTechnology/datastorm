import pandas as pd
import numpy as np
import xgboost as xgb
import shap
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error
from typing import Dict, Any, List, Optional
import logging
import sys
import pickle
import os

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s|%(levelname)s|%(message)s",
    datefmt="%Y-%m-%d_%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# --- Helper Functions: Metrics ---
def calculate_wmape(y_true, y_pred):
    """Calculates Weighted Mean Absolute Percentage Error."""
    sum_abs_diff = np.sum(np.abs(y_true - y_pred))
    sum_abs_true = np.sum(np.abs(y_true))
    return sum_abs_diff / sum_abs_true if sum_abs_true > 0 else 0.0

def calculate_rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))

def calculate_mape(y_true, y_pred):
    """
    Calculates MAPE correctly by masking zero values in y_true.
    Avoids division by zero errors.
    """
    mask = y_true != 0
    if np.sum(mask) == 0:
        return 0.0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask]))

class DataImputer:
    """STAGE 1: CENSORED DEMAND IMPUTATION"""
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.feature_cols = [
            'year', 'month', 'day', 'weekday', 'is_weekend', 'is_holiday',
            'temperature', 'list_price', 'discount_pct', 'promo_flag',
            'store_id', 'sku_id', 'category', 'brand',
            'stock_opening'
        ]
        self.cat_cols = ['store_id', 'sku_id', 'category', 'brand']

    def _preprocess(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        data = df.copy()
        for col in self.feature_cols:
            if col not in data.columns: data[col] = 0
        X = data[self.feature_cols].copy()
        for col in self.cat_cols:
            X[col] = X[col].astype(str)
            if is_training:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col])
                self.encoders[col] = le
            else:
                if col in self.encoders:
                    le = self.encoders[col]
                    X[col] = X[col].map(lambda s: le.transform([s])[0] if s in le.classes_ else -1)
        return X

    def train_and_impute(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info("█"*60)
        logger.info("STAGE1|DEMAND_IMPUTATION|START")
        logger.info("█"*60)
        train_mask = df['stock_out_flag'] == 0
        df_train = df[train_mask].copy()

        X_train = self._preprocess(df_train, is_training=True)
        y_train = df_train['units_sold'].astype(float)

        # Using Poisson for count data
        self.model = xgb.XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1, n_jobs=-1,
            objective='count:poisson', random_state=42
        )
        self.model.fit(X_train, y_train)
        logger.info("STAGE1|IMPUTER_MODEL|TRAINED")

        impute_mask = df['stock_out_flag'] == 1
        df['adjusted_demand'] = df['units_sold'].astype(float) # Default

        if impute_mask.sum() > 0:
            logger.info(f"STAGE1|CENSORED_ROWS|FOUND|{impute_mask.sum()}")
            df_missing = df[impute_mask].copy()
            X_missing = self._preprocess(df_missing, is_training=False)
            
            predicted = self.model.predict(X_missing)
            current = df.loc[impute_mask, 'units_sold'].astype(float)
            df.loc[impute_mask, 'adjusted_demand'] = np.maximum(predicted, current)
            logger.info(f"STAGE1|CENSORED_ROWS|IMPUTED|{impute_mask.sum()}")
        
        logger.info("STAGE1|DEMAND_IMPUTATION|COMPLETE")
        logger.info("█"*60)
        return df

class MultiHorizonForecaster:
    """STAGE 2: DIRECT MULTI-STEP FORECASTING - OPTIMIZED FOR HORIZON=1"""
    def __init__(self, horizons: List[int] = [1]):
        self.horizons = horizons
        self.models = {} 
        self.encoders = {}
        # Added cyclical features and interactions
        self.base_features = [
            'month', 'weekday', 'day', 'is_weekend', 'is_holiday',
            'temperature', 'list_price', 'discount_pct', 'promo_flag',
            'store_id', 'sku_id', 'category', 'brand',
            'stock_opening'
        ]
        self.lag_cols = []

    def _create_features(self, df: pd.DataFrame, target_col: str = 'adjusted_demand') -> pd.DataFrame:
        """
        Generates Lag, Rolling Mean, EWMA, Seasonality AND Interaction features.
        """
        df = df.copy().sort_values(['store_id', 'sku_id', 'date'])
        self.lag_cols = [] 
        
        # Ensure date
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['dayofyear'] = df['date'].dt.dayofyear
            df['weekofyear'] = df['date'].dt.isocalendar().week.astype(int)
            df['month_sin'] = np.sin(2 * np.pi * df['date'].dt.month / 12)
            df['weekday_cos'] = np.cos(2 * np.pi * df['date'].dt.weekday / 7)
        
        # 1. Extended Lags
        lags = [1, 7, 14, 21, 28]
        if len(df) > 370:
            lags.append(364) # Yearly Seasonality

        for lag in lags:
            col_name = f'lag_{lag}'
            df[col_name] = df.groupby(['store_id', 'sku_id'])[target_col].shift(lag)
            self.lag_cols.append(col_name)

        for window in [7, 14, 30]:
            # Mean
            col_mean = f'rolling_mean_{window}'
            df[col_mean] = df.groupby(['store_id', 'sku_id'])[target_col].transform(
                lambda x: x.shift(1).rolling(window).mean()
            )
            self.lag_cols.append(col_mean)
            
            col_max = f'rolling_max_{window}'
            df[col_max] = df.groupby(['store_id', 'sku_id'])[target_col].transform(
                lambda x: x.shift(1).rolling(window).max()
            )
            self.lag_cols.append(col_max)

        # 3. INTERACTION FEATURES (NEW - POWERFUL)
        df['promo_weekend'] = df['promo_flag'] * df['is_weekend']
        self.lag_cols.append('promo_weekend')

        df['price_ratio'] = df['list_price'] / df.groupby(['store_id', 'sku_id'])['list_price'].transform('mean')
        self.lag_cols.append('price_ratio')

        df['momentum_7_14'] = df['rolling_mean_7'] / (df['rolling_mean_14'] + 1e-3)
        self.lag_cols.append('momentum_7_14')

        return df

    def _prepare_xy(self, df: pd.DataFrame, horizon: int):
        data = df.copy()
        
        # Log Transformation of Target to handle high variance
        # We predict log(sales + 1) instead of raw sales
        data['target'] = np.log1p(data.groupby(['store_id', 'sku_id'])['adjusted_demand'].shift(-horizon))
        
        data = data.dropna()
        feature_cols = self.base_features + list(set(self.lag_cols))

        for col in ['store_id', 'sku_id', 'category', 'brand']:
            le = LabelEncoder()
            data[col] = le.fit_transform(data[col].astype(str))
            if horizon == self.horizons[0]:
                self.encoders[col] = le

        return data[feature_cols], data['target'], feature_cols

    def train(self, df: pd.DataFrame, use_existing_features: bool = False):
        logger.info("█"*60)
        logger.info("STAGE2|FORECASTING|START")
        logger.info("█"*60)
        
        if use_existing_features:
            df_rich = df.copy()
        else:
            df_rich = self._create_features(df)

        for h in self.horizons:
            X, y, feature_names = self._prepare_xy(df_rich, horizon=h)
            
            # Changed to 'reg:squarederror' because we are predicting Log(Sales)
            model = xgb.XGBRegressor(
                n_estimators=500, max_depth=8, learning_rate=0.05, n_jobs=-1, 
                objective='reg:squarederror', random_state=42
            )
            model.fit(X, y)
            logger.info(f"STAGE2|HORIZON_{h}|MODEL|TRAINED")
            
            # Calculate Feature Importance
            importance = model.feature_importances_
            indices = np.argsort(importance)[-5:] # Top 5
            top_features = [feature_names[i] for i in indices]
            logger.info(f"STAGE2|HORIZON_{h}|TOP_FEATURES|{','.join(top_features)}")

            self.models[h] = {'model': model, 'features': feature_names}
            
        logger.info("STAGE2|FORECASTING|COMPLETE")
        logger.info("█"*60)

    def predict(self, context_data: Dict, horizon: int) -> Dict[str, Any]:
        if horizon not in self.models: raise ValueError(f"No model for H{horizon}")
        model_info = self.models[horizon]
        model = model_info['model']
        feature_names = model_info['features']

        df_input = pd.DataFrame([context_data])
        for col, le in self.encoders.items():
            if col in df_input.columns:
                df_input[col] = df_input[col].apply(lambda x: le.transform([str(x)])[0] if str(x) in le.classes_ else -1)
        for col in feature_names:
            if col not in df_input.columns: df_input[col] = 0 
        
        X_pred = df_input[feature_names]
        
        # Predict Log Value
        log_pred = model.predict(X_pred)[0]
        # Inverse Log: exp(pred) - 1
        prediction = np.expm1(log_pred)
        prediction = max(0.0, float(prediction))
        
        # SHAP Explanation
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_pred)
        shap_dict = {feature_names[i]: float(shap_values[0][i]) for i in range(len(feature_names))}
        
        return {
            'prediction': prediction,
            'shap_explanation': shap_dict
        }

    def predict_batch_for_eval(self, df: pd.DataFrame, horizon: int, use_existing_features: bool = False) -> tuple:
        if horizon not in self.models: return None, None
        model_info = self.models[horizon]
        model = model_info['model']
        
        if use_existing_features: df_rich = df.copy()
        else: df_rich = self._create_features(df)
            
        X, log_y_true, feature_cols = self._prepare_xy(df_rich, horizon)
        
        for col in ['store_id', 'sku_id', 'category', 'brand']:
            if col in self.encoders:
                le = self.encoders[col]
                X[col] = X[col].map(lambda s: le.transform([s])[0] if s in le.classes_ else -1)
                
        if len(X) == 0: return None, None
        
        # Predict
        log_y_pred = model.predict(X[feature_cols])
        
        # Inverse Transform both True and Pred to calculate metrics on Real Scale
        y_true = np.expm1(log_y_true)
        y_pred = np.maximum(0, np.expm1(log_y_pred))
        
        return y_true, y_pred

class RecursiveMultiStepForecaster:
    """STAGE 2B: RECURSIVE 7-DAY FORECASTING"""
    def __init__(self, base_forecaster: MultiHorizonForecaster, raw_data: pd.DataFrame, lead_time_predictor=None):
        self.forecaster = base_forecaster
        self.raw_data = raw_data  # Full historical data for context
        self.lead_time_predictor = lead_time_predictor
        
    def predict_next_7_days(self, start_date: str, store_id: str, sku_id: str, 
                            category: str, brand: str) -> List[Dict]:
        """
        Recursively predict next 7 days by:
        1. Getting last known sales data for lags
        2. Predicting day 1
        3. Using predicted day 1 to update lags for day 2, etc.
        """
        start_date = pd.to_datetime(start_date)
        
        # Get historical data for this store/sku
        hist = self.raw_data[
            (self.raw_data['store_id'] == store_id) & 
            (self.raw_data['sku_id'] == sku_id)
        ].copy().sort_values('date')
        
        if len(hist) == 0:
            raise ValueError(f"No historical data for store={store_id}, sku={sku_id}")
        
        # Initialize with last known sales data
        last_row = hist.iloc[-1].to_dict()
        predictions = []
        
        # Keep track of recent sales for lag features
        recent_sales = hist['adjusted_demand'].tail(30).tolist() if 'adjusted_demand' in hist.columns else hist['units_sold'].tail(30).tolist()
        
        for day_offset in range(1, 8):  # Days 1-7
            pred_date = start_date + pd.Timedelta(days=day_offset-1)
            
            # Build context for this prediction
            context = {
                'month': pred_date.month,
                'weekday': pred_date.weekday(),
                'day': pred_date.day,
                'is_weekend': 1 if pred_date.weekday() >= 5 else 0,
                'is_holiday': 0,  # Default, could be enhanced with holiday calendar
                'temperature': last_row.get('temperature', 20.0),
                'list_price': last_row.get('list_price', 100.0),
                'discount_pct': last_row.get('discount_pct', 0.0),
                'promo_flag': last_row.get('promo_flag', 0),
                'store_id': store_id,
                'sku_id': sku_id,
                'category': category,
                'brand': brand,
                'stock_opening': last_row.get('stock_opening', 100.0),
                # Lag features
                'lag_1': recent_sales[-1] if len(recent_sales) >= 1 else 0,
                'lag_7': recent_sales[-7] if len(recent_sales) >= 7 else 0,
                'lag_14': recent_sales[-14] if len(recent_sales) >= 14 else 0,
                'lag_28': recent_sales[-28] if len(recent_sales) >= 28 else 0,
                'rolling_mean_7': np.mean(recent_sales[-7:]) if len(recent_sales) >= 7 else 0,
                'rolling_mean_30': np.mean(recent_sales[-30:]) if len(recent_sales) >= 30 else 0,
            }
            
            # Predict using horizon=1 model (1-day ahead)
            result = self.forecaster.predict(context, horizon=1)
            predicted_units = result['prediction']
            logger.info(f"FORECAST|DAY_{day_offset}|DATE={pred_date.strftime('%Y-%m-%d')}|UNITS_SOLD={predicted_units:.2f}")
            
            # Predict lead time if predictor is available
            predicted_lead_time = None
            lead_time_shap = None
            if self.lead_time_predictor is not None:
                try:
                    lead_time_context = {
                        'date': pred_date.strftime('%Y-%m-%d'),
                        'year': pred_date.year,
                        'month': pred_date.month,
                        'day': pred_date.day,
                        'weekofyear': pred_date.isocalendar()[1],
                        'weekday': pred_date.weekday(),
                        'is_weekend': 1 if pred_date.weekday() >= 5 else 0,
                        'is_holiday': 0,
                        'temperature': last_row.get('temperature', 20.0),
                        'rain_mm': last_row.get('rain_mm', 0.0),
                        'store_id': store_id,
                        'country': last_row.get('country', 'Unknown'),
                        'city': last_row.get('city', 'Unknown'),
                        'channel': last_row.get('channel', 'Unknown'),
                        'latitude': last_row.get('latitude', 0.0),
                        'longitude': last_row.get('longitude', 0.0),
                        'sku_id': sku_id,
                        'sku_name': last_row.get('sku_name', sku_id),
                        'category': category,
                        'subcategory': last_row.get('subcategory', category),
                        'brand': brand,
                        'supplier_id': last_row.get('supplier_id', 'Unknown')
                    }
                    lead_time_result = self.lead_time_predictor.predict(lead_time_context)
                    predicted_lead_time = round(lead_time_result['prediction'], 2)
                    lead_time_shap = lead_time_result['shap_explanation']
                    logger.info(f"LEAD_TIME|DAY_{day_offset}|DATE={pred_date.strftime('%Y-%m-%d')}|DAYS={predicted_lead_time}")
                except Exception as e:
                    logger.warning(f"LEAD_TIME|DAY_{day_offset}|ERROR|{str(e)}")
            
            prediction_data = {
                'date': pred_date.strftime('%Y-%m-%d'),
                'units_sold': round(predicted_units, 2),
                'shap_explanation': result['shap_explanation']
            }
            
            if predicted_lead_time is not None:
                prediction_data['lead_time_days'] = predicted_lead_time
                prediction_data['lead_time_shap_explanation'] = lead_time_shap
            
            predictions.append(prediction_data)
            
            # Update recent_sales with prediction for next iteration
            recent_sales.append(predicted_units)
            if len(recent_sales) > 30:
                recent_sales.pop(0)
        
        return predictions


class LeadTimePredictor:
    """STAGE 3: LEAD TIME PREDICTION"""
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.feature_cols = [
            'year', 'month', 'day', 'weekofyear', 'weekday', 'is_weekend', 'is_holiday',
            'temperature', 'rain_mm', 'store_id', 'country', 'city', 'channel',
            'latitude', 'longitude', 'sku_id', 'sku_name', 'category', 'subcategory', 'brand', 'supplier_id'
        ]
        self.cat_cols = ['store_id', 'country', 'city', 'channel', 'sku_id', 'sku_name', 'category', 'subcategory', 'brand', 'supplier_id']

    def _preprocess(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        data = df.copy()
        for col in self.feature_cols:
            if col not in data.columns: data[col] = 0
        X = data[self.feature_cols].copy()
        for col in self.cat_cols:
            X[col] = X[col].astype(str)
            if is_training:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col])
                self.encoders[col] = le
            else:
                if col in self.encoders:
                    le = self.encoders[col]
                    X[col] = X[col].map(lambda s: le.transform([s])[0] if s in le.classes_ else -1)
        return X

    def train(self, df: pd.DataFrame):
        logger.info("█"*60)
        logger.info("STAGE3|LEAD_TIME_PREDICTION|START")
        logger.info("█"*60)
        X = self._preprocess(df, is_training=True)
        y = df['lead_time_days']
        self.model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42, n_jobs=-1)
        self.model.fit(X, y)
        logger.info("STAGE3|LEAD_TIME_MODEL|TRAINED")
        logger.info("STAGE3|LEAD_TIME_PREDICTION|COMPLETE")
        logger.info("█"*60)

    def predict(self, context: Dict) -> Dict[str, Any]:
        if self.model is None: raise Exception("Model not trained.")
        df_pred = pd.DataFrame([context])
        X_pred = self._preprocess(df_pred, is_training=False)
        
        prediction = max(0.0, float(self.model.predict(X_pred)[0]))
        
        # SHAP Explanation
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X_pred)
        feature_names = self.feature_cols
        shap_dict = {feature_names[i]: float(shap_values[0][i]) for i in range(len(feature_names))}
        
        return {
            'prediction': prediction,
            'shap_explanation': shap_dict
        }

    def predict_batch_for_eval(self, df: pd.DataFrame) -> tuple:
        if self.model is None: return None, None
        X = self._preprocess(df, is_training=False)
        y_true = df['lead_time_days']
        y_pred = self.model.predict(X)
        return y_true, np.maximum(0, y_pred)

class DemandPipeline:
    """Orchestrator"""
    def __init__(self):
        self.imputer = DataImputer()
        self.forecaster = MultiHorizonForecaster(horizons=[1])  # Only horizon=1 for 7-day recursive
        self.lead_time_predictor = LeadTimePredictor()
        self.recursive_forecaster = None
        self.raw_data = None
        self.is_ready = False
        self.latest_metrics = {}

    def run_training_pipeline(self, df: pd.DataFrame):
        logger.info("="*60)
        logger.info("PIPELINE|START")
        logger.info("="*60)
        
        df_imputed = self.imputer.train_and_impute(df)
        self._perform_evaluation(df_imputed)
        
        logger.info("PIPELINE|PRODUCTION_RETRAINING")
        self.forecaster.train(df_imputed, use_existing_features=False) 
        self.lead_time_predictor.train(df)
        
        # Initialize recursive forecaster with lead time predictor
        self.raw_data = df_imputed
        self.recursive_forecaster = RecursiveMultiStepForecaster(self.forecaster, df_imputed, self.lead_time_predictor)
        
        self.is_ready = True
        logger.info("="*60)
        logger.info("PIPELINE|COMPLETE")
        logger.info("="*60)
        return self.latest_metrics

    def _perform_evaluation(self, df: pd.DataFrame):
        logger.info("█"*60)
        logger.info("EVALUATION|VALIDATION_28DAYS|START")
        logger.info("█"*60)
        max_date = df['date'].max()
        cutoff_date = max_date - pd.Timedelta(days=28)
        
        # Generate features globally
        helper = MultiHorizonForecaster()
        df_rich = helper._create_features(df)
        
        train_rich = df_rich[df_rich['date'] < cutoff_date].copy()
        test_rich = df_rich[df_rich['date'] >= cutoff_date].copy()
        
        # Lead time split
        train_raw = df[df['date'] < cutoff_date].copy()
        test_raw = df[df['date'] >= cutoff_date].copy()

        metrics = {}
        
        # A. Forecast Eval (Only H+1 since we use recursive for 7-day)
        if len(test_rich) > 0:
            logger.info("EVALUATION|FORECAST_MODEL_H1|TESTING")
            temp_forecaster = MultiHorizonForecaster(horizons=[1])
            temp_forecaster.train(train_rich, use_existing_features=True)
            
            y_true, y_pred = temp_forecaster.predict_batch_for_eval(test_rich, horizon=1, use_existing_features=True)
            if y_true is not None and len(y_true) > 0:
                metrics["Forecast_H1"] = {
                    "RMSE": round(calculate_rmse(y_true, y_pred), 2),
                    "MAE": round(mean_absolute_error(y_true, y_pred), 2),
                    "WMAPE": f"{calculate_wmape(y_true, y_pred):.2%}",
                    "MAPE": f"{calculate_mape(y_true, y_pred):.2f}%"
                }
                mean_val = np.mean(y_true)
                logger.info(f"EVALUATION|FORECAST_H1|RMSE={metrics['Forecast_H1']['RMSE']}|MAE={metrics['Forecast_H1']['MAE']}|WMAPE={metrics['Forecast_H1']['WMAPE']}|MAPE={metrics['Forecast_H1']['MAPE']}")

        # B. Lead Time Eval
        if len(test_raw) > 0:
            logger.info("EVALUATION|LEAD_TIME_MODEL|TESTING")
            temp_lt = LeadTimePredictor()
            temp_lt.train(train_raw)
            y_lt_true, y_lt_pred = temp_lt.predict_batch_for_eval(test_raw)
            if y_lt_true is not None:
                metrics["Lead_Time"] = {
                    "RMSE": round(calculate_rmse(y_lt_true, y_lt_pred), 2),
                    "MAE": round(mean_absolute_error(y_lt_true, y_lt_pred), 2)
                }
                logger.info(f"EVALUATION|LEAD_TIME|RMSE={metrics['Lead_Time']['RMSE']}|MAE={metrics['Lead_Time']['MAE']}")

        self.latest_metrics = metrics
        logger.info("EVALUATION|VALIDATION_28DAYS|COMPLETE")
        logger.info("█"*60)

    def get_forecast(self, context, horizon):
        if not self.is_ready: raise Exception("Pipeline not trained.")
        return self.forecaster.predict(context, horizon)

    def get_7day_forecast(self, start_date: str, store_id: str, sku_id: str, 
                          category: str, brand: str):
        if not self.is_ready: raise Exception("Pipeline not trained.")
        if self.recursive_forecaster is None: raise Exception("Recursive forecaster not initialized.")
        return self.recursive_forecaster.predict_next_7_days(start_date, store_id, sku_id, category, brand)

    def get_lead_time_forecast(self, context):
        if not self.is_ready: raise Exception("Pipeline not trained.")
        return self.lead_time_predictor.predict(context)
    
    def save_models(self, save_dir: str):
        """Save all models to disk"""
        logger.info(f"SAVE|MODELS|DIR={save_dir}|START")
        os.makedirs(save_dir, exist_ok=True)
        
        # Save imputer
        with open(os.path.join(save_dir, 'imputer.pkl'), 'wb') as f:
            pickle.dump(self.imputer, f)
        logger.info("SAVE|IMPUTER|COMPLETE")
        
        # Save forecaster
        with open(os.path.join(save_dir, 'forecaster.pkl'), 'wb') as f:
            pickle.dump(self.forecaster, f)
        logger.info("SAVE|FORECASTER|COMPLETE")
        
        # Save lead time predictor
        with open(os.path.join(save_dir, 'lead_time_predictor.pkl'), 'wb') as f:
            pickle.dump(self.lead_time_predictor, f)
        logger.info("SAVE|LEAD_TIME_PREDICTOR|COMPLETE")
        
        # Save raw data for recursive forecaster
        if self.raw_data is not None:
            self.raw_data.to_pickle(os.path.join(save_dir, 'raw_data.pkl'))
            logger.info("SAVE|RAW_DATA|COMPLETE")
        
        # Save metadata
        metadata = {
            'is_ready': self.is_ready,
            'latest_metrics': self.latest_metrics
        }
        with open(os.path.join(save_dir, 'metadata.pkl'), 'wb') as f:
            pickle.dump(metadata, f)
        logger.info("SAVE|METADATA|COMPLETE")
        logger.info(f"SAVE|MODELS|DIR={save_dir}|COMPLETE")
    
    def load_models(self, load_dir: str):
        """Load all models from disk"""
        logger.info(f"LOAD|MODELS|DIR={load_dir}|START")
        
        # Load imputer
        with open(os.path.join(load_dir, 'imputer.pkl'), 'rb') as f:
            self.imputer = pickle.load(f)
        logger.info("LOAD|IMPUTER|COMPLETE")
        
        # Load forecaster
        with open(os.path.join(load_dir, 'forecaster.pkl'), 'rb') as f:
            self.forecaster = pickle.load(f)
        logger.info("LOAD|FORECASTER|COMPLETE")
        
        # Load lead time predictor
        with open(os.path.join(load_dir, 'lead_time_predictor.pkl'), 'rb') as f:
            self.lead_time_predictor = pickle.load(f)
        logger.info("LOAD|LEAD_TIME_PREDICTOR|COMPLETE")
        
        # Load raw data
        raw_data_path = os.path.join(load_dir, 'raw_data.pkl')
        if os.path.exists(raw_data_path):
            self.raw_data = pd.read_pickle(raw_data_path)
            # Reinitialize recursive forecaster
            self.recursive_forecaster = RecursiveMultiStepForecaster(
                self.forecaster, self.raw_data, self.lead_time_predictor
            )
            logger.info("LOAD|RAW_DATA|COMPLETE")
        
        # Load metadata
        with open(os.path.join(load_dir, 'metadata.pkl'), 'rb') as f:
            metadata = pickle.load(f)
            self.is_ready = metadata['is_ready']
            self.latest_metrics = metadata['latest_metrics']
        logger.info("LOAD|METADATA|COMPLETE")
        logger.info(f"LOAD|MODELS|DIR={load_dir}|COMPLETE")

pipeline = DemandPipeline()
import pandas as pd
import numpy as np
import xgboost as xgb
import shap
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error
from typing import Dict, Any, List, Optional
import logging
import sys

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    datefmt="%H:%M:%S",
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
        logger.info(">>> [Stage 1] Censored Demand Imputation Started...")
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

        impute_mask = df['stock_out_flag'] == 1
        df['adjusted_demand'] = df['units_sold'].astype(float) # Default

        if impute_mask.sum() > 0:
            logger.info(f"    - Found {impute_mask.sum()} censored rows.")
            df_missing = df[impute_mask].copy()
            X_missing = self._preprocess(df_missing, is_training=False)
            
            predicted = self.model.predict(X_missing)
            current = df.loc[impute_mask, 'units_sold'].astype(float)
            df.loc[impute_mask, 'adjusted_demand'] = np.maximum(predicted, current)
        
        logger.info(">>> [Stage 1] Completed.")
        logger.info("-" * 40)
        return df

class MultiHorizonForecaster:
    """STAGE 2: DIRECT MULTI-STEP FORECASTING"""
    def __init__(self, horizons: List[int] = [1, 7, 14]):
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
        logger.info(">>> [Stage 2] Forecasting Training...")
        
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
            
            # Calculate Feature Importance
            importance = model.feature_importances_
            indices = np.argsort(importance)[-5:] # Top 5
            top_features = [feature_names[i] for i in indices]
            logger.info(f"    - H+{h} Trained. Top Features: {top_features}")

            self.models[h] = {'model': model, 'features': feature_names}
            
        logger.info(">>> [Stage 2] Completed.")
        logger.info("-" * 40)

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
        logger.info(">>> [Stage 3] Lead Time Training...")
        X = self._preprocess(df, is_training=True)
        y = df['lead_time_days']
        self.model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42, n_jobs=-1)
        self.model.fit(X, y)
        logger.info(">>> [Stage 3] Completed.")
        logger.info("-" * 40)

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
        self.forecaster = MultiHorizonForecaster(horizons=[1, 7, 14])
        self.lead_time_predictor = LeadTimePredictor()
        self.is_ready = False
        self.latest_metrics = {}

    def run_training_pipeline(self, df: pd.DataFrame):
        logger.info("=" * 50)
        logger.info("  PIPELINE START")
        logger.info("=" * 50)
        
        df_imputed = self.imputer.train_and_impute(df)
        self._perform_evaluation(df_imputed)
        
        logger.info(">>> [Production] Retraining on FULL dataset...")
        self.forecaster.train(df_imputed, use_existing_features=False) 
        self.lead_time_predictor.train(df)
        
        self.is_ready = True
        logger.info("=" * 50)
        logger.info("  PIPELINE FINISHED")
        logger.info("=" * 50)
        return self.latest_metrics

    def _perform_evaluation(self, df: pd.DataFrame):
        logger.info(">>> [Evaluation] Last 28 Days Validation...")
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
        
        # A. Forecast Eval
        if len(test_rich) > 0:
            logger.info("    - Forecast Models...")
            temp_forecaster = MultiHorizonForecaster(horizons=[1, 7, 14])
            temp_forecaster.train(train_rich, use_existing_features=True)
            
            for h in [1, 7, 14]:
                y_true, y_pred = temp_forecaster.predict_batch_for_eval(test_rich, horizon=h, use_existing_features=True)
                if y_true is not None and len(y_true) > 0:
                    metrics[f"Forecast_H{h}"] = {
                        "RMSE": round(calculate_rmse(y_true, y_pred), 2),
                        "MAE": round(mean_absolute_error(y_true, y_pred), 2),
                        "WMAPE": f"{calculate_wmape(y_true, y_pred):.2%}",
                        "MAPE": f"{calculate_mape(y_true, y_pred):.2f}%"
                    }
                    mean_val = np.mean(y_true)
                    logger.info(f"      [H+{h}] Mean Actual: {mean_val:.1f} | WMAPE: {metrics[f'Forecast_H{h}']['WMAPE']} | MAPE: {metrics[f'Forecast_H{h}']['MAPE']}")

        # B. Lead Time Eval
        if len(test_raw) > 0:
            logger.info("    - Lead Time Predictor...")
            temp_lt = LeadTimePredictor()
            temp_lt.train(train_raw)
            y_lt_true, y_lt_pred = temp_lt.predict_batch_for_eval(test_raw)
            if y_lt_true is not None:
                metrics["Lead_Time"] = {
                    "RMSE": round(calculate_rmse(y_lt_true, y_lt_pred), 2),
                    "MAE": round(mean_absolute_error(y_lt_true, y_lt_pred), 2)
                }
                logger.info(f"      [Lead Time] MAE: {metrics['Lead_Time']['MAE']}")

        self.latest_metrics = metrics
        logger.info(">>> [Evaluation] Done.")

    def get_forecast(self, context, horizon):
        if not self.is_ready: raise Exception("Pipeline not trained.")
        return self.forecaster.predict(context, horizon)

    def get_lead_time_forecast(self, context):
        if not self.is_ready: raise Exception("Pipeline not trained.")
        return self.lead_time_predictor.predict(context)

pipeline = DemandPipeline()
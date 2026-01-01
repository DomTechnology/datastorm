import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from typing import Dict, Any, List, Optional
import pickle
import os

class DataImputer:
    """
    STAGE 1: CENSORED DEMAND IMPUTATION
    Responsible for learning from in-stock days and correcting out-of-stock days.
    """
    def __init__(self):
        self.model = None
        self.encoders = {}
        # Columns used for imputation logic
        self.feature_cols = [
            'year', 'month', 'day', 'weekday', 'is_weekend', 'is_holiday',
            'temperature', 'list_price', 'discount_pct', 'promo_flag',
            'store_id', 'sku_id', 'category', 'brand'
        ]
        self.cat_cols = ['store_id', 'sku_id', 'category', 'brand']

    def _preprocess(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        data = df.copy()
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
                    # Handle unseen labels carefully
                    X[col] = X[col].map(lambda s: le.transform([s])[0] if s in le.classes_ else -1)
        return X

    def train_and_impute(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Trains on available data and fills in missing demand where stock_out_flag == 1.
        """
        print(">>> [Stage 1] Starting Imputation Process...")

        # 1. Filter valid data (Stock Available)
        train_mask = df['stock_out_flag'] == 0
        df_train = df[train_mask].copy()

        # Split for evaluation
        from sklearn.model_selection import train_test_split
        train_df, val_df = train_test_split(df_train, test_size=0.2, random_state=42)

        X_train = self._preprocess(train_df, is_training=True)
        y_train = train_df['units_sold']
        X_val = self._preprocess(val_df, is_training=False)
        y_val = val_df['units_sold']

        # 2. Train XGBoost Imputer
        self.model = xgb.XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1, n_jobs=-1
        )
        self.model.fit(X_train, y_train)

        # Evaluate on validation set
        y_pred_val = self.model.predict(X_val)
        mse = mean_squared_error(y_val, y_pred_val)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_val, y_pred_val)
        r2 = r2_score(y_val, y_pred_val)

        print(f"      Imputation Validation - MSE: {mse:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")

        # 3. Predict for Out-of-Stock rows
        impute_mask = df['stock_out_flag'] == 1
        if impute_mask.sum() > 0:
            print(f"    Found {impute_mask.sum()} rows to impute.")
            df_missing = df[impute_mask].copy()
            X_missing = self._preprocess(df_missing, is_training=False)

            # Predict potential demand
            predicted_demand = self.model.predict(X_missing)
            predicted_demand = np.maximum(predicted_demand, 0) # Ensure non-negative

            # Fill values into the original dataframe
            # Creating a new column 'adjusted_demand' to keep trace
            df['adjusted_demand'] = df['units_sold']
            df.loc[impute_mask, 'adjusted_demand'] = predicted_demand
        else:
            df['adjusted_demand'] = df['units_sold']

        print(">>> [Stage 1] Imputation Completed.")
        return df

class MultiHorizonForecaster:
    """
    STAGE 2: DIRECT MULTI-STEP FORECASTING
    Manages separate models for different horizons (T+1, T+7, T+14).
    """
    def __init__(self, horizons: List[int] = [1, 7, 14]):
        self.horizons = horizons
        self.models = {} # Dictionary to store model for each horizon
        self.encoders = {}
        # Core features for forecasting (including Future knowns)
        self.base_features = [
            'month', 'weekday', 'is_weekend', 'is_holiday',
            'temperature', 'list_price', 'discount_pct', 'promo_flag',
            'store_id', 'sku_id', 'category', 'brand'
        ]
        # Lag features to be generated
        self.lag_cols = []

    def _create_features(self, df: pd.DataFrame, target_col: str = 'adjusted_demand') -> pd.DataFrame:
        """
        Generates lags and rolling means based on the CLEANED (imputed) demand.
        """
        df = df.copy().sort_values(['store_id', 'sku_id', 'date'])

        # 1. Basic Lags (Last 1, 7, 14, 28 days observed sales)
        # Note: These lags are relative to 'today'.
        # For a T+7 model, we still use T-0, T-7 as inputs because that's what we know today.
        for lag in [1, 7, 14, 28]:
            col_name = f'lag_{lag}'
            df[col_name] = df.groupby(['store_id', 'sku_id'])[target_col].shift(lag)
            self.lag_cols.append(col_name)

        # 2. Rolling Means (Trend)
        for window in [7, 30]:
            col_name = f'rolling_mean_{window}'
            df[col_name] = df.groupby(['store_id', 'sku_id'])[target_col].transform(
                lambda x: x.shift(1).rolling(window).mean()
            )
            self.lag_cols.append(col_name)

        return df

    def _prepare_xy(self, df: pd.DataFrame, horizon: int):
        """
        Prepares X and y for a specific horizon.
        y is shifted backwards by 'horizon' days.
        """
        data = df.copy()

        # Create target: Future Sales at T + horizon
        data['target'] = data.groupby(['store_id', 'sku_id'])['adjusted_demand'].shift(-horizon)

        # Drop NaN (created by lags and shifting)
        data = data.dropna()

        # Features
        feature_cols = self.base_features + list(set(self.lag_cols))

        # Encoding (Simplified for brevity)
        for col in ['store_id', 'sku_id', 'category', 'brand']:
            le = LabelEncoder()
            data[col] = le.fit_transform(data[col].astype(str))
            # Save encoder for T+1 only (reuse for others or maintain separate if needed)
            if horizon == 1:
                self.encoders[col] = le

        return data[feature_cols], data['target'], feature_cols

    def train(self, df: pd.DataFrame):
        print(">>> [Stage 2] Starting Forecasting Training...")

        # Generate generic features first
        df_rich = self._create_features(df)

        for h in self.horizons:
            print(f"    Training model for Horizon T+{h}...")
            X, y, feature_names = self._prepare_xy(df_rich, horizon=h)

            # Split for validation
            from sklearn.model_selection import train_test_split
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

            model = xgb.XGBRegressor(
                n_estimators=100, learning_rate=0.05, n_jobs=-1, objective='reg:squarederror'
            )
            model.fit(X_train, y_train)

            # Evaluate on validation set
            y_pred_val = model.predict(X_val)
            mse = mean_squared_error(y_val, y_pred_val)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_val, y_pred_val)
            r2 = r2_score(y_val, y_pred_val)

            print(f"      Horizon T+{h} - MSE: {mse:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")

            # Save model and feature names for this horizon
            self.models[h] = {
                'model': model,
                'features': feature_names
            }

        print(">>> [Stage 2] Training Completed.")

    def predict(self, context_data: Dict, horizon: int) -> float:
        """
        Predicts for a single instance given the horizon.
        context_data must contain current lags and future planned info (price, etc.)
        """
        if horizon not in self.models:
            raise ValueError(f"No model trained for horizon {horizon}")

        model_info = self.models[horizon]
        model = model_info['model']
        feature_names = model_info['features']

        # Convert dict to DataFrame
        df_input = pd.DataFrame([context_data])

        # Encode Categoricals
        for col, le in self.encoders.items():
            if col in df_input.columns:
                df_input[col] = df_input[col].apply(lambda x: le.transform([str(x)])[0] if str(x) in le.classes_ else -1)

        # Ensure column order matches training
        # Fill missing numeric cols with 0 if necessary
        for col in feature_names:
            if col not in df_input.columns:
                df_input[col] = 0 

        X_pred = df_input[feature_names]
        prediction = model.predict(X_pred)[0]

        return max(0.0, float(prediction))

class LeadTimePredictor:
    """
    Predicts lead time days based on various features.
    """
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
        print(">>> Training Lead Time Predictor...")
        X = self._preprocess(df, is_training=True)
        y = df['lead_time_days']

        # Split for validation
        from sklearn.model_selection import train_test_split
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
        self.model.fit(X_train, y_train)

        # Evaluate on validation set
        y_pred_val = self.model.predict(X_val)
        mse = mean_squared_error(y_val, y_pred_val)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_val, y_pred_val)
        r2 = r2_score(y_val, y_pred_val)

        print(f"      Lead Time Validation - MSE: {mse:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        print(">>> Lead Time Predictor Trained.")

    def predict(self, context: Dict) -> float:
        if self.model is None:
            raise Exception("Lead Time Predictor not trained.")

        # Convert context to DataFrame
        df_pred = pd.DataFrame([context])
        X_pred = self._preprocess(df_pred, is_training=False)

        prediction = self.model.predict(X_pred)[0]
        return max(0.0, float(prediction))

class DemandPipeline:
    """
    FACADE Pattern: Orchestrates the Data Imputation and Forecasting stages.
    """
    def __init__(self):
        self.imputer = DataImputer()
        self.forecaster = MultiHorizonForecaster(horizons=[1, 7, 14])
        self.lead_time_predictor = LeadTimePredictor()
        self.is_ready = False

    def run_training_pipeline(self, df: pd.DataFrame):
        # Step 1: Impute missing demand
        df_clean = self.imputer.train_and_impute(df)

        # Step 2: Train forecast models on clean data
        self.forecaster.train(df_clean)

        # Step 3: Train lead time predictor
        self.lead_time_predictor.train(df)

        self.is_ready = True
        print(">>> Pipeline Training Finished Successfully.")

    def get_forecast(self, context: Dict, horizon: int):
        if not self.is_ready:
            raise Exception("Pipeline not trained.")
        return self.forecaster.predict(context, horizon)

    def get_lead_time_forecast(self, context: Dict):
        if not self.is_ready:
            raise Exception("Pipeline not trained.")
        return self.lead_time_predictor.predict(context)

# Singleton Instance
pipeline = DemandPipeline()
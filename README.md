# DataStorm

A comprehensive platform for FMCG (Fast-Moving Consumer Goods) sales data analysis, visualization, and AI-powered forecasting. Built with modern web technologies and machine learning to provide actionable insights for retail decision-making.

## 🆕 Recent Enhancements (Jan 2026)

### ✅ Priority Features Implemented

1. **⚠️ Stock Alert System**
   - Real-time low-stock detection with intelligent thresholds
   - 3-level urgency system (Critical/Warning/Info)
   - Automatic recommended order quantity calculation
   - Days until stockout estimation

2. **💰 Financial Analytics Dashboard**
   - Revenue trending and performance metrics
   - Profit margin analysis by category
   - Key Performance Indicators (KPIs)
   - Interactive charts and detailed breakdowns

3. **📊 Enhanced Reporting**
   - Category-level profit analysis
   - Stockout rate tracking
   - Promotional impact measurement
   - Sales and unit trends

## Business Usage

DataStorm addresses critical business challenges in FMCG retail:

### Inventory Optimization
- **Demand Forecasting**: Predict future sales at SKU-store level to optimize inventory levels
- **Stock-out Prevention**: Identify potential stock-outs using AI models that account for censored demand
- **Overstock Reduction**: Minimize excess inventory through accurate demand predictions

### Sales Performance Analysis
- **Geographic Insights**: Visualize sales performance across different store locations
- **Category Performance**: Track sales by product categories to inform product assortment decisions
- **Promotional Impact**: Measure the effectiveness of promotions on sales volume

### Supply Chain Optimization
- **Lead Time Forecasting**: Predict supplier delivery times to optimize inventory ordering
- **Procurement Planning**: Anticipate delays and adjust purchasing schedules
- **Risk Mitigation**: Identify potential supply chain disruptions based on historical patterns

## AI Logic: Two-Stage Forecasting Pipeline

DataStorm implements a sophisticated two-stage AI pipeline for accurate sales forecasting:

### Stage 1: Censored Demand Recovery
**Problem**: Traditional sales data is "censored" - when stock runs out, recorded sales don't reflect true demand. This leads to underestimation of actual customer demand.

**Solution**: The AI model first recovers the true underlying demand by:
- Analyzing historical stock-out patterns
- Using statistical methods to estimate unfulfilled demand
- Incorporating external factors (temperature, holidays, promotions)
- Building probabilistic models of demand distribution

**Key Features**:
- Detects stock-out events from inventory data
- Estimates censored demand using maximum likelihood estimation
- Accounts for demand variability across different time periods
- Integrates weather and promotional data as demand modifiers

### Stage 2: Multi-Horizon Forecasting
**Problem**: FMCG sales exhibit complex patterns including trends, seasonality, promotions, and external factors.

**Solution**: The forecasting model uses advanced machine learning with engineered features:

#### Feature Engineering
- **Lag Features**: Historical sales at different time lags (1, 7, 14, 28 days)
- **Rolling Statistics**: Moving averages (7-day, 30-day) to capture trends
- **Temporal Features**: Month, weekday, weekend/holiday indicators
- **Store-SKU Specific**: Individual models for each store-product combination
- **External Factors**: Temperature, pricing, promotions, category, brand

#### Model Architecture
- **Time Series Models**: ARIMA-based approaches with exogenous variables
- **Machine Learning**: Gradient boosting or neural networks for complex patterns
- **Ensemble Methods**: Combines multiple models for robust predictions
- **Uncertainty Quantification**: Provides prediction intervals for risk assessment

#### Prediction Horizons
- Short-term: 1-7 days for operational planning
- Medium-term: 8-14 days for inventory replenishment
- Configurable horizons based on business needs

### Integration with Business Systems
- **Real-time Predictions**: API-based predictions for integration with ERP systems
- **Batch Processing**: Scheduled forecasts for planning cycles
- **Alert System**: Notifications for predicted stock-outs or demand spikes

## Data Processing Logic

### Sales Data Aggregation
- **Daily Aggregation**: Consolidates transaction-level data to daily sales
- **Multi-dimensional Filtering**: Country, store, SKU, category, brand filters
- **Time-based Analysis**: Year, month, weekday, holiday classifications

### Geographic Analysis
- **Store Location Mapping**: Latitude/longitude coordinates for spatial analysis
- **Stock-out Rate Calculation**: (Stock on Hand) / (Stock on Hand + Units Sold)
- **GeoJSON Output**: Standardized format for map visualizations

### Statistical Computations
- **Holiday/Weekend Segmentation**: Separate analysis for different time periods
- **Promotional Impact**: Compare sales with/without promotions
- **Top-N Analysis**: Rank products by sales volume with configurable limits

## Features

### 📊 Data Visualization
- **Interactive Map**: Geographic sales distribution with stock-out indicators
- **Time Series Charts**: Daily sales trends with filtering capabilities
- **Category Breakdowns**: Sales performance by product categories
- **Top SKU Dashboards**: Performance metrics for best-selling products
- **Comparative Analysis**: Holiday vs. weekday sales patterns

### 🤖 AI Forecasting
- **SKU-Store Level Predictions**: Granular forecasting for optimal inventory
- **Multi-factor Models**: Incorporates weather, promotions, and historical patterns
- **Censored Demand Handling**: Accounts for stock-out limitations
- **RESTful API**: Seamless integration with existing systems

### 🛠️ Technical Features
- **High-Performance APIs**: Async FastAPI backend for scalable operations
- **Database Optimization**: Efficient queries with SQLAlchemy ORM
- **Error Handling**: Robust validation and business logic checks
- **CORS Configuration**: Secure cross-origin resource sharing

## Tech Stack

### Frontend
- **Next.js 14** - React framework for production
- **TypeScript** - Type-safe JavaScript
- **Redux Toolkit** - State management
- **Chart Libraries** - Data visualization components

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Robust relational database
- **httpx** - Async HTTP client for AI integration

### AI Backend
- **Python** - Core ML implementation
- **Statistical Models** - Time series and regression algorithms
- **pandas** - Data manipulation and feature engineering

## API Endpoints

### Main Backend (FastAPI)
- `GET /country` - Available countries for filtering
- `GET /net_sales/daily` - Daily net sales with time filters
- `GET /unit_sold/daily` - Daily units sold with time filters
- `GET /net_sales/category` - Category-wise sales breakdown
- `GET /unit_sold/holiday_weekday` - Holiday/weekend sales statistics
- `GET /sku/top` - Top performing SKUs by sales volume
- `GET /unit_sold/promo` - Promotional sales impact analysis
- `GET /net_sales/location` - Geographic sales data (GeoJSON format)
- `POST /predict` - AI-powered sales forecasting with lag calculations
- `POST /predict_lead_time` - AI-powered lead time forecasting

### AI Backend
- `POST /predict` - Two-stage forecasting pipeline execution
- `POST /predict_lead_time` - Lead time prediction for supply chain optimization

## Setup and Running the Project

### General Requirements

- Git
- Python 3.9+
- Node.js 18+ and npm
- PostgreSQL

### 1. Backend

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install the required libraries
pip install -r requirements.txt

# Create a .env file and configure the environment variables
# Based on the .env.example file (if available)
```

Create a `.env` file in the `backend` directory with the following content:

```env
# PostgreSQL Database
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_db_name

# Upstash Redis (for caching)
UPSTASH_REDIS_REST_URL="your_redis_url"
UPSTASH_REDIS_REST_TOKEN="your_redis_token"

# Google Gemini API (for chatbot)
GEMINI_API_KEY="your_gemini_api_key"
```

**Run the Backend:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. AI Backend

```bash
# Navigate to the ai_backend directory
cd ai_backend

# Create and activate a virtual environment (similar to the Backend)
python -m venv venv
# Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate

# Install the libraries
pip install -r requirements.txt
```

**Note**: On the first run, the AI backend may automatically train the models if no saved files are found. This process can take some time.

**Run the AI Backend:**

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

Create a `.env.local` file in the `frontend` directory with the following content:

```env
# URL of the main Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Access Token for MapTiler (for map display)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your_maptiler_token"
```

**Run the Frontend:**

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` to see the application.

## Folder Structure

```
datastorm/
├── ai_backend/          # Microservice for AI/ML forecasting
│   ├── core.py         # Core logic for ML models
│   ├── server.py       # FastAPI server for forecasting APIs
│   └── requirements.txt
├── backend/             # Main API Server
│   ├── app/
│   │   ├── main.py     # FastAPI application with business logic
│   │   ├── model/      # SQLAlchemy database models
│   │   └── utils/      # Database connection utilities
│   └── requirements.txt
├── frontend/            # Next.js web application
│   ├── app/            # Pages and components using App Router
│   ├── components/     # Reusable components
│   └── public/         # Static assets
├── data/                # Sample data
└── notebook/            # Jupyter notebooks for exploratory analysis
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for FMCG retail analytics and forecasting
- Uses open-source libraries and frameworks
- Inspired by modern data-driven retail solutions

## Support

For questions or issues:
- Check the API documentation at `/docs`
- Review the code comments
- Open an issue on GitHub

---

**DataStorm** - Transforming retail data into actionable insights through advanced AI and analytics.
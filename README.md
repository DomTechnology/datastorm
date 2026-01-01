# DataStorm

A comprehensive platform for FMCG (Fast-Moving Consumer Goods) sales data analysis, visualization, and AI-powered forecasting. Built with modern web technologies and machine learning to provide actionable insights for retail decision-making.

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

## Project Structure

```
datastorm/
├── ai_backend/          # AI prediction service
│   ├── core.py         # ML model logic (censored demand + forecasting)
│   ├── server.py       # FastAPI server for AI API
│   └── requirements.txt
├── backend/            # Main API server
│   ├── app/
│   │   ├── main.py     # FastAPI app with business logic
│   │   ├── model/      # Database models
│   │   └── utils/      # Database utilities
│   └── requirements.txt
├── frontend/           # Next.js web app
│   ├── app/            # App router pages
│   ├── components/     # Reusable components
│   └── public/         # Static assets
├── data/               # Sample data files
└── notebook/           # Jupyter notebooks for analysis
```

## Configuration

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/datastorm
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_API_URL=http://localhost:8001
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for frontend components
- Write tests for new features
- Update documentation for API changes

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
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
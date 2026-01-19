# DataStorm

[![GitHub stars](https://img.shields.io/github/stars/DomTechnology/datastorm?style=social)](https://github.com/DomTechnology/datastorm) [![GitHub forks](https://img.shields.io/github/forks/DomTechnology/datastorm?style=social)](https://github.com/DomTechnology/datastorm) [![GitHub issues](https://img.shields.io/github/issues/DomTechnology/datastorm)](https://github.com/DomTechnology/datastorm/issues) [![GitHub pull requests](https://img.shields.io/github/issues-pr/DomTechnology/datastorm)](https://github.com/DomTechnology/datastorm/pulls) [![GitHub license](https://img.shields.io/github/license/DomTechnology/datastorm)](https://github.com/DomTechnology/datastorm/blob/main/LICENSE) [![GitHub repo size](https://img.shields.io/github/repo-size/DomTechnology/datastorm)](https://github.com/DomTechnology/datastorm)

---

<p align="center">
  <a href="#">
    <img src="https://github.com/DomTechnology/datastorm/images/banner.png" alt="Sponsor 1"/>
  </a>
</p>

---

## Overview

DataStorm is a comprehensive retail analytics and demand forecasting platform designed to provide actionable insights for FMCG (Fast-Moving Consumer Goods) and Fashion retail businesses. The platform combines advanced data analytics, machine learning-based demand forecasting, and interactive visualizations to help businesses make data-driven decisions.

---

## Features

- **Sales Analytics Dashboard**: Real-time visualization of net sales, unit sold, and revenue metrics
- **Demand Forecasting**: 7-day ML-powered demand prediction for inventory optimization
- **Multi-Currency Support**: Analysis across USD, EUR, CNY, and GBP
- **Geographic Analysis**: Sales comparison across multiple countries and stores
- **Channel Analytics**: Performance tracking across different sales channels
- **Inventory Optimization**: Stock alerts and safety stock recommendations
- **Pricing and Discount Analysis**: Impact assessment of promotional strategies
- **Supplier Performance**: Vendor evaluation and cost analysis
- **Weather Correlation**: Analysis of weather impact on sales patterns
- **Interactive Maps**: Geographic visualization of sales data

---

## Tech Stack

### Frontend
- Next.js 16
- React 19
- Tailwind CSS 4
- Recharts
- MapLibre GL
- Zustand (State Management)
- Framer Motion

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Upstash Redis (Caching)
- Google Generative AI

### AI/ML Backend
- Python
- Pandas
- Scikit-learn
- Custom ML Pipeline for Demand Forecasting

---

## Project Structure

```
datastorm/
├── frontend/          # Next.js frontend application
│   ├── app/           # App router pages and components
│   ├── components/    # Reusable UI components
│   └── lib/           # Utility functions
├── backend/           # FastAPI backend service
│   ├── app/           # Application code
│   │   ├── model/     # Database models
│   │   └── utils/     # Utility functions
│   └── requirements.txt
├── ai_backend/        # ML forecasting service
│   ├── core.py        # ML pipeline
│   ├── server.py      # FastAPI server
│   └── models/        # Trained model storage
└── data/              # Dataset directory
    ├── Fashion/       # Fashion retail dataset
    └── FMCG/          # FMCG sales dataset
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL
- Redis (optional, for caching)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/DomTechnology/datastorm.git
cd datastorm
```

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API will be available at `http://localhost:8000`

#### 4. AI Backend Setup

```bash
cd ai_backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

The AI/ML API will be available at `http://localhost:8001`

---

## API Documentation

### Backend API

The main backend provides endpoints for:

| Category | Endpoints |
|----------|-----------|
| General | `/information`, `/country`, `/store/list`, `/city/list` |
| Sales | `/net_sales/daily`, `/unit_sold/daily`, `/net_sales/category` |
| SKU | `/sku/top`, `/sku/list` |
| Stock | `/stock_alerts` |
| Analytics | `/analytics/revenue`, `/analytics/profit`, `/analytics/kpi` |
| AI/ML | Demand forecasting endpoints |

Full API documentation available at `http://localhost:8000/docs`

### AI Backend API

| Endpoint | Description |
|----------|-------------|
| `POST /train` | Train the forecasting model |
| `POST /forecast` | Get 7-day demand forecast |

Full API documentation available at `http://localhost:8001/docs`

---

## Datasets

### Fashion Retail Dataset
- 4M+ sales records
- 7 countries coverage
- 35 distinct stores
- Customer demographics and behavior data

### FMCG Dataset
- Product sales data
- Inventory levels
- Promotional data

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/datastorm
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
GOOGLE_API_KEY=your_google_api_key
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Thanks to all contributors who have helped build this project
- Special thanks to our sponsors and organizers for their support

---

## Contact

For questions or support, please open an issue on GitHub or contact the maintainers.

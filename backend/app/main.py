from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from .model.sales_fact import SalesFact
from .utils.db import get_db
from fastapi.middleware.cors import CORSMiddleware
import httpx
from datetime import datetime, timedelta

app = FastAPI(
    title="FMCG Sales Data API",
    description="API to retrieve FMCG sales data with pagination support.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

@app.get("/country")
def get_rows(
    db: Session = Depends(get_db)
):
    countries = db.query(SalesFact.country).distinct().all()

    result = [c[0] for c in countries if c[0] is not None]

    return {
        "countries": result
    }

@app.get("/net_sales/daily")
def get_net_sales(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
):
    query = db.query(
        SalesFact.date,
        func.sum(SalesFact.net_sales).label("net_sales")
    )

    yearList = db.query(func.extract("year", SalesFact.date).distinct()).order_by(func.extract("year", SalesFact.date)).all()

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.group_by(SalesFact.date).order_by(SalesFact.date).all()

    start_date = rows[0].date if rows else None
    end_date = rows[-1].date if rows else None

    return {
        "meta": {
            "startDate": start_date,
            "endDate": end_date,
            "yearList": [int(y[0]) for y in yearList]
        },
        "data": [
            {"date": r.date, "net_sales": float(r.net_sales)}
            for r in rows
        ]
    }

@app.get("/unit_sold/daily")
def get_units_sold(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
):
    query = db.query(
        SalesFact.date,
        func.sum(SalesFact.units_sold).label("units_sold")
    )

    yearList = db.query(func.extract("year", SalesFact.date).distinct()).order_by(func.extract("year", SalesFact.date)).all()

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.group_by(SalesFact.date).order_by(SalesFact.date).all()

    start_date = rows[0].date if rows else None
    end_date = rows[-1].date if rows else None

    return {
        "meta": {
            "startDate": start_date,
            "endDate": end_date,
            "yearList": [int(y[0]) for y in yearList]
        },
        "data": [
            {"date": r.date, "units_sold": int(r.units_sold)}
            for r in rows
        ]
    }

@app.get("/net_sales/category")
def get_net_sales_by_category(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
):
    query = db.query(
        SalesFact.category,
        func.sum(SalesFact.net_sales).label("net_sales")
    )

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.group_by(SalesFact.category).order_by(SalesFact.category).all()

    return {
        "data": [
            {"category": r.category, "net_sales": float(r.net_sales)}
            for r in rows
        ]
    }

@app.get("/unit_sold/holiday_weekday")
def get_unit_sold_statistics(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
):
    groups = {
        "weekday": lambda q: q.where(SalesFact.is_weekend == False),
        "weekend": lambda q: q.where(SalesFact.is_weekend == True),
        "holiday": lambda q: q.where(SalesFact.is_holiday == True),
        "non_holiday": lambda q: q.where(SalesFact.is_holiday == False),
    }

    result = {}

    for name, filter_fn in groups.items():
        query = db.query(
            func.sum(SalesFact.units_sold).label("total_units_sold"),
        )

        query = filter_fn(query)

        if country != "all":
            query = query.filter(SalesFact.country == country)
        if year != "all":
            query = query.filter(func.extract("year", SalesFact.date) == int(year))
        if month != "all":
            query = query.filter(func.extract("month", SalesFact.date) == int(month))

        res = query.one()

        result[name] = {
            "total_units_sold": int(res.total_units_sold) if res.total_units_sold is not None else 0
        }

    return result

@app.get("/sku/top")
def get_top_skus(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
    limit: int = Query(20, description="Number of top SKUs to return"),
):
    query = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name,
        func.sum(SalesFact.units_sold).label("units_sold")
    )

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))

    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.group_by(SalesFact.sku_id, SalesFact.sku_name).order_by(func.sum(SalesFact.units_sold).desc()).limit(limit).all()

    return {
        "data": [
            {"sku_id": r.sku_id, "sku_name": r.sku_name, "units_sold": int(r.units_sold)}
            for r in rows
        ]
    }

@app.get("/unit_sold/promo")
def get_units_sold_discount_scatter(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
):
    query = db.query(
        SalesFact.promo_flag,
        func.sum(SalesFact.units_sold).label("units_sold"),
        func.sum(SalesFact.net_sales).label("net_sales"),
    )

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))

    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = (
        query
        .group_by(SalesFact.promo_flag)
        .all()
    )

    return {
        "data": [
            {
                "promo_flag": r.promo_flag,
                "units_sold": int(r.units_sold),
                "net_sales": float(r.net_sales)
            }
            for r in rows
        ]
    }

@app.get("/net_sales/location")
def get_net_sales_by_location(
    country: str = Query("all"),
    db: Session = Depends(get_db),
    year: str = Query("all"),
    month: str = Query("all"),
):
    query = db.query(
        SalesFact.store_id,
        SalesFact.latitude,
        SalesFact.longitude,
        func.sum(SalesFact.net_sales).label("net_sales"),
        func.sum(SalesFact.units_sold).label("units_sold"),
        func.sum(SalesFact.stock_on_hand).label("stock_on_hand"),
        (
            func.sum(SalesFact.stock_on_hand) /
            func.nullif(
                func.sum(SalesFact.stock_on_hand) + func.sum(SalesFact.units_sold),
                0
            )
        ).label("stock_out_rate")
    )

    if country != "all":
        query = query.filter(SalesFact.country == country)

    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))

    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.group_by(
        SalesFact.store_id,
        SalesFact.latitude,
        SalesFact.longitude
    ).all()

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [r.longitude, r.latitude],
                },
                "properties": {
                    "store_id": r.store_id,
                    "net_sales": float(r.net_sales),
                    "stock_out_rate": float(r.stock_out_rate or 0),
                },
            }
            for r in rows
            if r.latitude is not None and r.longitude is not None
        ],
    }

@app.post("/predict_unit_sold")
async def predict(
    request: dict,
    db: Session = Depends(get_db)
):
    try:
        store_id = request['store_id']
        sku_id = request['sku_id']
        date_str = request['date']  # 'YYYY-MM-DD'
        date = datetime.strptime(date_str, '%Y-%m-%d').date()

        # Calculate lags
        lag_dates = {
            'lag_1': date - timedelta(days=1),
            'lag_7': date - timedelta(days=7),
            'lag_14': date - timedelta(days=14),
            'lag_28': date - timedelta(days=28),
        }

        lags = {}
        for lag_name, lag_date in lag_dates.items():
            row = db.query(SalesFact.units_sold).filter(
                SalesFact.store_id == store_id,
                SalesFact.sku_id == sku_id,
                SalesFact.date == lag_date
            ).first()
            lags[lag_name] = float(row.units_sold) if row else 0.0

        # Rolling mean 7: average from date-6 to date
        rolling_7_start = date - timedelta(days=6)
        rolling_7_rows = db.query(SalesFact.units_sold).filter(
            SalesFact.store_id == store_id,
            SalesFact.sku_id == sku_id,
            SalesFact.date >= rolling_7_start,
            SalesFact.date <= date
        ).all()
        rolling_mean_7 = sum(r.units_sold for r in rolling_7_rows) / len(rolling_7_rows) if rolling_7_rows else 0.0

        # Rolling mean 30: from date-29 to date
        rolling_30_start = date - timedelta(days=29)
        rolling_30_rows = db.query(SalesFact.units_sold).filter(
            SalesFact.store_id == store_id,
            SalesFact.sku_id == sku_id,
            SalesFact.date >= rolling_30_start,
            SalesFact.date <= date
        ).all()
        rolling_mean_30 = sum(r.units_sold for r in rolling_30_rows) / len(rolling_30_rows) if rolling_30_rows else 0.0

        # Build the body
        body = {
            "horizon": request.get('horizon', 7),
            "month": request['month'],
            "weekday": request['weekday'],
            "is_weekend": request['is_weekend'],
            "is_holiday": request['is_holiday'],
            "temperature": request['temperature'],
            "list_price": request['list_price'],
            "discount_pct": request['discount_pct'],
            "promo_flag": request['promo_flag'],
            "store_id": store_id,
            "sku_id": sku_id,
            "category": request['category'],
            "brand": request['brand'],
            **lags,
            "rolling_mean_7": rolling_mean_7,
            "rolling_mean_30": rolling_mean_30
        }

        # Send to AI server
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8001/predict_unit_sold", json=body)
            response.raise_for_status()
            return response.json()

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_lead_time")
async def predict_lead_time(
    request: dict,
    db: Session = Depends(get_db)
):
    try:
        # Build the body with all provided features
        body = {
            "date": request['date'],
            "year": request['year'],
            "month": request['month'],
            "day": request['day'],
            "weekofyear": request['weekofyear'],
            "weekday": request['weekday'],
            "is_weekend": request['is_weekend'],
            "is_holiday": request['is_holiday'],
            "temperature": request['temperature'],
            "rain_mm": request['rain_mm'],
            "store_id": request['store_id'],
            "country": request['country'],
            "city": request['city'],
            "channel": request['channel'],
            "latitude": request['latitude'],
            "longitude": request['longitude'],
            "sku_id": request['sku_id'],
            "sku_name": request['sku_name'],
            "category": request['category'],
            "subcategory": request['subcategory'],
            "brand": request['brand'],
            "supplier_id": request['supplier_id']
        }

        # Send to AI server
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8001/predict_lead_time", json=body)
            response.raise_for_status()
            return response.json()

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
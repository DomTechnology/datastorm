from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal
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

@app.get("/information")
def get_information(db: Session = Depends(get_db)):
    # Gộp tất cả tính toán vào một query duy nhất
    result = db.query(
        func.count(func.distinct(SalesFact.country)).label("number_of_countries"),
        func.sum(SalesFact.net_sales).label("total_net_sales"),
        func.count(func.distinct(SalesFact.store_id)).label("total_stores"),
        func.count(func.distinct(SalesFact.sku_id)).label("total_products"),
        func.count(func.distinct(SalesFact.date)).label("number_of_days"),
    ).one()

    return {
        "number_of_countries": result.number_of_countries,
        "total_net_sales": float(result.total_net_sales or 0),
        "total_stores": result.total_stores,
        "total_products": result.total_products,
        "number_of_days": result.number_of_days,
    }
    

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
    store: str = Query("all", description="Filter by store, use 'all' for no filter"),
    category: str = Query("all", description="Filter by category, use 'all' for no filter"),
    brand: str = Query("all", description="Filter by brand, use 'all' for no filter"),
    sku_id: str = Query("all", description="Filter by SKU ID, use 'all' for no filter"),
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

    if store != "all":
        query = query.filter(SalesFact.store_id == store)

    if category != "all":
        query = query.filter(SalesFact.category == category)

    if brand != "all":
        query = query.filter(SalesFact.brand == brand)

    if sku_id != "all":
        query = query.filter(SalesFact.sku_id == sku_id)

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
    # Subquery: sum units_sold per sku per store
    sales_per_sku_store = db.query(
        SalesFact.sku_id,
        SalesFact.store_id,
        func.sum(SalesFact.units_sold).label("total_units")
    )

    if country != "all":
        sales_per_sku_store = sales_per_sku_store.filter(SalesFact.country == country)
    if year != "all":
        sales_per_sku_store = sales_per_sku_store.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        sales_per_sku_store = sales_per_sku_store.filter(func.extract("month", SalesFact.date) == int(month))

    sales_per_sku_store = sales_per_sku_store.group_by(SalesFact.sku_id, SalesFact.store_id).subquery()

    # Subquery: max units per sku
    max_per_sku = db.query(
        sales_per_sku_store.c.sku_id,
        func.max(sales_per_sku_store.c.total_units).label("max_units")
    ).group_by(sales_per_sku_store.c.sku_id).subquery()

    # Subquery: top store per sku
    top_store_per_sku = db.query(
        sales_per_sku_store.c.sku_id,
        sales_per_sku_store.c.store_id,
        sales_per_sku_store.c.total_units.label("units_sold")
    ).join(
        max_per_sku,
        (sales_per_sku_store.c.sku_id == max_per_sku.c.sku_id) &
        (sales_per_sku_store.c.total_units == max_per_sku.c.max_units)
    ).subquery()

    # Subquery: get latest details per sku/store
    latest_details = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name,
        SalesFact.store_id,
        SalesFact.city,
        SalesFact.category,
        SalesFact.subcategory,
        SalesFact.brand,
        SalesFact.supplier_id,
        SalesFact.stock_opening,
        SalesFact.lead_time_days,
        func.row_number().over(
            partition_by=[SalesFact.sku_id, SalesFact.store_id],
            order_by=SalesFact.date.desc()
        ).label("rn")
    )
    
    if country != "all":
        latest_details = latest_details.filter(SalesFact.country == country)
    if year != "all":
        latest_details = latest_details.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        latest_details = latest_details.filter(func.extract("month", SalesFact.date) == int(month))
    
    latest_details = latest_details.subquery()
    
    # Get latest record (rn=1)
    details_ranked = db.query(
        latest_details.c.sku_id,
        latest_details.c.sku_name,
        latest_details.c.store_id,
        latest_details.c.city,
        latest_details.c.category,
        latest_details.c.subcategory,
        latest_details.c.brand,
        latest_details.c.supplier_id,
        latest_details.c.stock_opening,
        latest_details.c.lead_time_days
    ).filter(latest_details.c.rn == 1).subquery()

    # Final query: combine all
    query = db.query(
        top_store_per_sku.c.sku_id,
        details_ranked.c.sku_name,
        details_ranked.c.category,
        details_ranked.c.subcategory,
        details_ranked.c.brand,
        details_ranked.c.supplier_id,
        top_store_per_sku.c.store_id,
        details_ranked.c.city,
        top_store_per_sku.c.units_sold,
        details_ranked.c.stock_opening,
        details_ranked.c.lead_time_days
    ).join(
        details_ranked,
        (top_store_per_sku.c.sku_id == details_ranked.c.sku_id) &
        (top_store_per_sku.c.store_id == details_ranked.c.store_id)
    ).order_by(top_store_per_sku.c.units_sold.desc()).limit(limit)

    rows = query.all()

    return {
        "data": [
            {
                "sku_id": r.sku_id,
                "sku_name": r.sku_name,
                "category": r.category,
                "subcategory": r.subcategory,
                "brand": r.brand,
                "supplier_id": r.supplier_id,
                "store_id": r.store_id,
                "city": r.city,
                "units_sold": int(r.units_sold),
                "stock_opening": int(r.stock_opening) if r.stock_opening else 0,
                "lead_time_days": int(r.lead_time_days) if r.lead_time_days else 0
            }
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
    db: Session = Depends(get_db),
):
    query = db.query(
        SalesFact.store_id,
        SalesFact.latitude,
        SalesFact.longitude,

        func.sum(SalesFact.net_sales).label("net_sales"),

        func.sum(
            case(
                (SalesFact.stock_out_flag.is_(True), literal(1)),
                else_=literal(0)
            )
        ).label("stock_out_count"),

        func.count().label("total_count"),
    ).group_by(
        SalesFact.store_id,
        SalesFact.latitude,
        SalesFact.longitude
    )

    rows = query.all()

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
                    "net_sales": float(r.net_sales or 0),
                    "stock_out_count": int(r.stock_out_count or 0),
                    "stock_out_rate": float(
                        r.stock_out_count / r.total_count
                        if r.total_count else 0
                    ),
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
        # Validate required fields
        required_fields = [
            'date', 'horizon', 'month', 'weekday', 'is_weekend', 'is_holiday',
            'temperature', 'list_price', 'discount_pct', 'promo_flag',
            'store_id', 'sku_id', 'category', 'brand', 'stock_opening'
        ]

        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Validate horizon
        if request['horizon'] not in [1, 7, 14]:
            raise HTTPException(status_code=400, detail="Horizon must be 1, 7, or 14.")

        # Parse date
        date_str = request['date']
        date = datetime.strptime(date_str, '%Y-%m-%d').date()

        # Calculate lags from database
        lag_dates = {
            'lag_1': date - timedelta(days=1),
            'lag_7': date - timedelta(days=7),
            'lag_14': date - timedelta(days=14),
            'lag_28': date - timedelta(days=28),
        }
        lags = {}
        for lag_name, lag_date in lag_dates.items():
            row = db.query(SalesFact.units_sold).filter(
                SalesFact.store_id == request['store_id'],
                SalesFact.sku_id == request['sku_id'],
                SalesFact.date == lag_date
            ).first()
            lags[lag_name] = float(row.units_sold) if row else 0.0
        # Rolling mean 7: average from date-6 to date
        rolling_7_start = date - timedelta(days=6)
        rolling_7_rows = db.query(SalesFact.units_sold).filter(
            SalesFact.store_id == request['store_id'],
            SalesFact.sku_id == request['sku_id'],
            SalesFact.date >= rolling_7_start,
            SalesFact.date <= date
        ).all()
        rolling_mean_7 = sum(r.units_sold for r in rolling_7_rows) / len(rolling_7_rows) if rolling_7_rows else 0.0
        # Rolling mean 30: from date-29 to date
        rolling_30_start = date - timedelta(days=29)
        rolling_30_rows = db.query(SalesFact.units_sold).filter(
            SalesFact.store_id == request['store_id'],
            SalesFact.sku_id == request['sku_id'],
            SalesFact.date >= rolling_30_start,
            SalesFact.date <= date
        ).all()
        rolling_mean_30 = sum(r.units_sold for r in rolling_30_rows) / len(rolling_30_rows) if rolling_30_rows else 0.0

        # Build the request body for the AI backend API
        body = {
            "horizon": request['horizon'],
            "month": request['month'],
            "weekday": request['weekday'],
            "is_weekend": request['is_weekend'],
            "is_holiday": request['is_holiday'],
            "temperature": request['temperature'],
            "list_price": request['list_price'],
            "discount_pct": request['discount_pct'],
            "promo_flag": request['promo_flag'],
            "store_id": request['store_id'],
            "sku_id": request['sku_id'],
            "category": request['category'],
            "brand": request['brand'],
            "stock_opening": request['stock_opening'],
            **lags,
            "rolling_mean_7": rolling_mean_7,
            "rolling_mean_30": rolling_mean_30
        }
        # Send to AI server
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8001/ai/predict_unit_sold", json=body)
            response.raise_for_status()
            result = response.json()

            # Return the result in the expected format
            return {
                "sku_id": result["sku_id"],
                "predicted_demand": result["predicted_demand"],
                "horizon_days": result["horizon_days"],
                "shap_explanation": result["shap_explanation"],
                "status": result["status"]
            }

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get('/store/list')
def get_store_list(
    db: Session = Depends(get_db)
):
    stores = db.query(
        SalesFact.store_id,
    ).distinct().all()

    return {
        "data": [s[0] for s in stores if s[0] is not None]
    }

@app.get('/category/list')
def get_category_list(
    db: Session = Depends(get_db)
):
    categories = db.query(
        SalesFact.category
    ).distinct().all()

    result = [c[0] for c in categories if c[0] is not None]

    return {
        "data": result
    }

@app.get('/brand/list')
def get_brand_list(
    db: Session = Depends(get_db)
):
    brands = db.query(
        SalesFact.brand
    ).distinct().all()

    result = [b[0] for b in brands if b[0] is not None]

    return {
        "data": result
    }

@app.get('/product/list')
def get_product_list(
    category: str = Query(None, description="Filter by category"),
    brand: str = Query(None, description="Filter by brand"),
    db: Session = Depends(get_db)
):
    query = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name
    ).distinct()

    if category:
        query = query.filter(SalesFact.category == category)
    if brand:
        query = query.filter(SalesFact.brand == brand)

    products = query.all()

    result = [
        {"sku_id": p.sku_id, "sku_name": p.sku_name}
        for p in products
    ]

    return {
        "data": result
    }

@app.post("/predict_lead_time")
async def predict_lead_time(
    request: dict,
    db: Session = Depends(get_db)
):
    try:
        # Validate required fields for lead time prediction
        required_fields = [
            'date', 'year', 'month', 'day', 'weekofyear', 'weekday', 'is_weekend',
            'is_holiday', 'temperature', 'rain_mm', 'store_id', 'country', 'city',
            'channel', 'latitude', 'longitude', 'sku_id', 'sku_name', 'category',
            'subcategory', 'brand', 'supplier_id'
        ]

        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Build the request body for the new AI backend API
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
            response = await client.post("http://localhost:8001/ai/predict_lead_time", json=body)
            response.raise_for_status()
            result = response.json()

            # Return the result in the expected format
            return {
                "sku_id": result["sku_id"],
                "supplier_id": result["supplier_id"],
                "predicted_lead_time_days": result["predicted_lead_time_days"],
                "shap_explanation": result["shap_explanation"],
                "status": result["status"]
            }

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/detail')
def get_sales_fact_detail(
    store_id: str = Query(..., description="Store ID"),
    sku_id: str = Query(..., description="SKU ID"),
    db: Session = Depends(get_db)
):
    row = db.query(SalesFact).filter(
        SalesFact.store_id == store_id,
        SalesFact.sku_id == sku_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Sales fact not found")

    return {
        "store_id": row.store_id,
        "sku_id": row.sku_id,
        "sku_name": row.sku_name,
        "category": row.category,
        "subcategory": row.subcategory,
        "brand": row.brand,
        "country": row.country,
        "city": row.city,
        "channel": row.channel,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "supplier_id": row.supplier_id
    }
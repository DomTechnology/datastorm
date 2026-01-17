from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal, text, desc, tuple_
from .model.sales_fact import SalesFact
from .utils.db import get_db
from fastapi.middleware.cors import CORSMiddleware
import httpx
from datetime import datetime, timedelta
import os
from google import genai
from upstash_redis.asyncio import Redis
import json

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

redis_client = Redis(
    url=os.getenv("UPSTASH_REDIS_REST_URL"),
    token=os.getenv("UPSTASH_REDIS_REST_TOKEN"),
)
CACHE_TTL = 600

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
async def get_top_skus(
    country: str = Query("all", description="Country to filter by"),
    db: Session = Depends(get_db),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter"),
    limit: int = Query(20, description="Number of top SKUs to return"),
):
    cache_key = f"top_skus:{country}:{year}:{month}:{limit}"

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

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

    result = {
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

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
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
async def get_net_sales_by_location(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Country to filter by"),
    year: str = Query("all", description="Filter by year, use 'all' for no filter"),
    month: str = Query("all", description="Filter by month, use 'all' for no filter")
):
    cache_key = f"net_sales_location:{country}:{year}:{month}"

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

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

    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))

    rows = query.all()

    result = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(r.longitude), float(r.latitude)],
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
    
    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
    }

@app.get('/store/list')
async def get_store_list(
    db: Session = Depends(get_db)
):
    cache_name = "store_list"

    cached = await redis_client.get(cache_name)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            "data": cached_data
        }

    stores = db.query(
        SalesFact.store_id,
    ).distinct().all()

    result = {
        "data": [s[0] for s in stores if s[0] is not None]
    }

    await redis_client.set(
        cache_name,
        json.dumps(result["data"])
    )

    return {
        "source": "db",
        **result
    }

@app.get('/city/list')
async def get_city_list(
    db: Session = Depends(get_db)
):
    cache_name = "city_list"
    cached = await redis_client.get(cache_name)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            "data": cached_data
        }

    stores = db.query(
        SalesFact.city,
    ).distinct().all()

    result = {
        "data": [s[0] for s in stores if s[0] is not None]
    }

    await redis_client.set(
        cache_name,
        json.dumps(result["data"])
    )

    return {
        "source": "db",
        **result
    }

@app.get('/category/list')
async def get_category_list(
    db: Session = Depends(get_db)
):
    cache_name = "category_list"

    cached = await redis_client.get(cache_name)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            "data": cached_data
        }

    categories = db.query(
        SalesFact.category
    ).distinct().all()

    result = [c[0] for c in categories if c[0] is not None]

    result = {
        "data": result
    }

    await redis_client.set(
        cache_name,
        json.dumps(result["data"])
    )

    return {
        "source": "db",
        **result
    }

@app.get('/brand/list')
async def get_brand_list(
    db: Session = Depends(get_db)
):
    cache_name = "brand_list"

    cached = await redis_client.get(cache_name)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            "data": cached_data
        }

    brands = db.query(
        SalesFact.brand
    ).distinct().all()

    result = [b[0] for b in brands if b[0] is not None]

    result = {
        "data": result
    }

    await redis_client.set(
        cache_name,
        json.dumps(result["data"])
    )

    return {
        "source": "db",
        **result
    }

@app.get('/product/list')
async def get_product_list(
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

    return  {
        "data": result
    }

@app.post("/predict_7days")
async def predict_7days(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Predicts 7-day demand and lead time forecast for a specific store and SKU.
    Forwards the request to AI backend /ai/predict_7days endpoint.
    """
    try:
        # Validate required fields
        required_fields = [
            'start_date', 'store_id', 'sku_id', 'category', 'brand'
        ]

        for field in required_fields:
            if field not in request:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Validate date format
        date_str = request['start_date']
        datetime.strptime(date_str, '%Y-%m-%d')

        # Build the request body for the AI backend API
        body = {
            "start_date": date_str,
            "store_id": request['store_id'],
            "sku_id": request['sku_id'],
            "category": request['category'],
            "brand": request['brand']
        }

        # Send to AI server
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8001/ai/predict_7days", json=body, timeout=30.0)
            response.raise_for_status()
            result = response.json()

            # Return the result
            return result

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"AI backend error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/stock_alerts')
async def get_stock_alerts(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    urgency: str = Query("all", description="Filter by urgency: critical, warning, all"),
):
    """
    Get stock alerts for items below safety stock levels.
    Returns items with low stock that may lead to stockouts.
    """
    from sqlalchemy import and_, or_

    cache_key = f"stock_alerts:{country}:{urgency}"

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }
    
    # Get latest date for each SKU-Store combination
    latest_records = db.query(
        SalesFact.sku_id,
        SalesFact.store_id,
        func.max(SalesFact.date).label("latest_date")
    ).group_by(SalesFact.sku_id, SalesFact.store_id).subquery()
    
    # Join with latest records
    query = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name,
        SalesFact.store_id,
        SalesFact.city,
        SalesFact.stock_on_hand,
        SalesFact.stock_opening,
        SalesFact.lead_time_days,
        func.avg(SalesFact.units_sold).label("avg_daily_sales"),
    ).join(
        latest_records,
        and_(
            SalesFact.sku_id == latest_records.c.sku_id,
            SalesFact.store_id == latest_records.c.store_id,
            SalesFact.date == latest_records.c.latest_date
        )
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    
    # Filter for low stock or stockout
    query = query.filter(
        or_(
            SalesFact.stock_on_hand < SalesFact.stock_opening * 0.2,
            SalesFact.stock_out_flag == True
        )
    ).group_by(
        SalesFact.sku_id, SalesFact.sku_name, SalesFact.store_id,
        SalesFact.city, SalesFact.stock_on_hand, SalesFact.stock_opening,
        SalesFact.lead_time_days
    ).order_by(SalesFact.stock_on_hand.asc())
    
    alerts = []
    for row in query.all():
        avg_daily = row.avg_daily_sales or 1
        stock_level = row.stock_on_hand or 0
        days_left = stock_level / avg_daily if avg_daily > 0 else 0
        lead_time = row.lead_time_days or 7
        
        # Determine urgency
        if stock_level == 0 or days_left < lead_time:
            alert_urgency = "critical"
        elif days_left < lead_time + 3:
            alert_urgency = "warning"
        else:
            alert_urgency = "info"
        
        if urgency != "all" and alert_urgency != urgency:
            continue
        
        alerts.append({
            "sku_id": row.sku_id,
            "sku_name": row.sku_name,
            "store_id": row.store_id,
            "city": row.city,
            "current_stock": int(row.stock_on_hand or 0),
            "safety_stock": int(row.stock_opening or 0),
            "avg_daily_sales": round(float(row.avg_daily_sales or 0), 2),
            "days_until_stockout": round(float(days_left), 1),
            "lead_time_days": int(row.lead_time_days or 0),
            "recommended_order_qty": max(int(row.stock_opening or 0) * 2 - int(row.stock_on_hand or 0), 0),
            "urgency": alert_urgency,
        })
    
    result = {
        "data": alerts,
        "summary": {
            "critical_count": sum(1 for a in alerts if a["urgency"] == "critical"),
            "warning_count": sum(1 for a in alerts if a["urgency"] == "warning"),
            "total_alerts": len(alerts)
        }
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
    }

@app.get('/detail')
def get_sales_fact_detail(
    store_id: str = Query(..., description="Store ID"),
    sku_id: str = Query(..., description="SKU ID"),
    date: str = Query(None, description="Date (not used currently)"),
    db: Session = Depends(get_db)
):
    row = db.query(SalesFact).filter(
        SalesFact.store_id == store_id,
        SalesFact.sku_id == sku_id,
        SalesFact.date == date
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Sales fact not found")

    return {
        "store_id": row.store_id,
        "sku_id": row.sku_id,
        "date": row.date,
        "country": row.country,
        "city": row.city,
        "channel": row.channel,
        "category": row.category,
        "subcategory": row.subcategory,
        "brand": row.brand,
        "supplier_id": row.supplier_id,
        "net_sales": float(row.net_sales) if row.net_sales is not None else 0.0,
        "units_sold": int(row.units_sold) if row.units_sold is not None else 0,
        "promo_flag": row.promo_flag,
        "list_price": float(row.list_price) if row.list_price is not None else 0.0,
        "discount_pct": float(row.discount_pct) if row.discount_pct is not None else 0.0,
        "stock_opening": int(row.stock_opening) if row.stock_opening is not None else 0,
        "stock_out_flag": row.stock_out_flag,
        "lead_time_days": int(row.lead_time_days) if row.lead_time_days is not None else 0,
        "is_holiday": row.is_holiday,
        "is_weekend": row.is_weekend,
        "temperature": float(row.temperature) if row.temperature is not None else 0.0,
        "rain_mm": float(row.rain_mm) if row.rain_mm is not None else 0.0,
        "latitude": float(row.latitude) if row.latitude is not None else 0.0,
        "longitude": float(row.longitude) if row.longitude is not None else 0.0,
        "weekday": row.weekday,
        "month": row.month,
    }

# ==================== FINANCIAL ANALYTICS ====================

@app.get('/analytics/revenue')
async def get_revenue_analytics(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month"),
):
    """
    Get revenue analytics with trends and breakdown.
    """
    cache_key = f"revenue:{country}:{year}:{month}"

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.date,
        func.sum(SalesFact.net_sales).label("total_revenue"),
        func.sum(SalesFact.units_sold).label("total_units"),
        func.count(func.distinct(SalesFact.store_id)).label("store_count")
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.date).order_by(SalesFact.date).all()
    
    total_revenue = sum(float(r.total_revenue or 0) for r in rows)
    total_units = sum(int(r.total_units or 0) for r in rows)
    avg_revenue_per_day = total_revenue / len(rows) if rows else 0

    result = {
        "data": [
            {
                "date": r.date.isoformat(),
                "revenue": float(r.total_revenue or 0),
                "units": int(r.total_units or 0),
                "stores": int(r.store_count or 0)
            }
            for r in rows
        ],
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_units": total_units,
            "avg_daily_revenue": round(avg_revenue_per_day, 2),
            "period_days": len(rows)
        }
    }

    await redis_client.set(cache_key, json.dumps(result),)
    
    return {
        "source": "db",
        **result
    }

@app.get('/analytics/profit')
async def get_profit_analytics(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month")
):
    """
    Get profit margin analytics by category and time period.
    """
    cache_key = f"profit:{country}:{year}:{month}"
    print("CACHE KEY:", cache_key)

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.category,
        func.sum(SalesFact.net_sales).label("total_revenue"),
        func.sum(SalesFact.purchase_cost * SalesFact.units_sold).label("total_cost"),
        func.count(func.distinct(SalesFact.date)).label("days"),
        func.avg(SalesFact.margin_pct).label("avg_margin")
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.category).all()
    
    categories_profit = []
    total_revenue = 0
    total_cost = 0
    
    for row in rows:
        revenue = float(row.total_revenue or 0)
        cost = float(row.total_cost or 0)
        profit = revenue - cost
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        total_revenue += revenue
        total_cost += cost
        
        categories_profit.append({
            "category": row.category,
            "revenue": round(revenue, 2),
            "cost": round(cost, 2),
            "profit": round(profit, 2),
            "margin_pct": round(margin, 2),
            "days": int(row.days or 0)
        })
    
    overall_profit = total_revenue - total_cost
    overall_margin = (overall_profit / total_revenue * 100) if total_revenue > 0 else 0

    result = {
        "data": sorted(categories_profit, key=lambda x: x["profit"], reverse=True),
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_profit": round(overall_profit, 2),
            "overall_margin_pct": round(overall_margin, 2),
        }
    }
    
    await redis_client.set(cache_key, json.dumps(result),)

    return {
        "source": "db",
        **result
    }

@app.get('/analytics/kpi')
def get_kpi_analytics(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
):
    """
    Get key performance indicators for the business.
    """
    query = db.query(SalesFact)
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    
    # Overall metrics
    total_records = db.query(func.count(SalesFact.sku_id)).filter(
        SalesFact.country == country if country != "all" else True
    ).scalar()
    
    stockout_count = db.query(func.count()).filter(
        SalesFact.stock_out_flag == True,
        SalesFact.country == country if country != "all" else True
    ).scalar()
    
    promo_sales = db.query(func.sum(SalesFact.net_sales)).filter(
        SalesFact.promo_flag == True,
        SalesFact.country == country if country != "all" else True
    ).scalar()
    
    total_sales = db.query(func.sum(SalesFact.net_sales)).filter(
        SalesFact.country == country if country != "all" else True
    ).scalar()
    
    return {
        "data": {
            "total_transactions": int(total_records or 0),
            "stockout_rate_pct": round((stockout_count / total_records * 100) if total_records > 0 else 0, 2),
            "promo_contribution_pct": round((float(promo_sales or 0) / float(total_sales or 1) * 100), 2),
            "total_sales": round(float(total_sales or 0), 2),
            "promo_sales": round(float(promo_sales or 0), 2)
        }
    }

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

@app.post("/suggestion/sales_demand")
async def suggestion(
    request: dict
):
    data = request.get("forecast_data", "")
    daily_demand_str = "\n".join(
        f"{item.get('date', 'N/A')}: "
        f"{round(item.get("predicted_unit_sold"), 2)} units"
        for item in data
    )

    base_system_prompt = f"""
    You are a smart and friendly Sales Demand Consulting Assistant of the DOM Team. 
    You specialize in FMCG demand forecasting and inventory planning. 
    Provide clear purchasing recommendations based on forecast data. 
    Keep answers under 150 words. Use natural, professional English. 
    Do not use any special formatting.
    Do not mention you are an AI model.
    Do not repeat the context back to the user or repeat your flow of thought.
    Give suggestion for optimal sales demand planning and inventory management.
    Do not use any markdown formatting.
    Make all the information that I gave you (category, brand, store id, sku id) in your suggestions to have bold font.

    This is the Forecast Data for 7 days of {request.get("sku_id", "")} at Store {request.get("store_id", "")}:
    - Category: {request.get("category", "")}
    - Brand: {request.get("brand", "")}
    - Daily Forecasted Demand: {daily_demand_str}
    """
    
    prompt = [
            {
                "role": "user",
                "parts": [
                    {"text": "You are a helpful assistant that helps people find information about FMCG sales data."}
                ]
            },
            {
                "role": "user",
                "parts": [
                    {"text": base_system_prompt}
                ]
            }
        ]

    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt
    )
    return {
        "type": "text",
        "message": response.text
    }

@app.post("/suggestion/lead_time")
async def suggestion(
    request: dict
):
    data = request.get("forecast_data", "")
    daily_lead_time_str = "\n".join(
        f"{item.get('date', 'N/A')}: "
        f"{round(item.get("predicted_unit_sold"), 2)} days"
        for item in data
    )

    base_system_prompt = f"""
    You are a smart and friendly Sales Demand Consulting Assistant of the DOM Team. 
    You specialize in FMCG demand forecasting and inventory planning. 
    Provide clear purchasing recommendations based on forecast data. 
    Keep answers under 150 words. Use natural, professional English. 
    Do not use any special formatting.
    Do not mention you are an AI model.
    Do not repeat the context back to the user or repeat your flow of thought.
    Give suggestions to reduce lead time and improve supply chain efficiency.
    Do not use any markdown formatting.
    Add bullet points.
    Make all the information that I gave you (category, brand, store id, sku id) in your suggestions to have bold font.

    This is the Forecast Data for 7 days of {request.get("sku_id", "")} at Store {request.get("store_id", "")}:
    - Category: {request.get("category", "")}
    - Brand: {request.get("brand", "")}
    - Daily Forecasted Lead Time: {daily_lead_time_str}
    """
    
    prompt = [
            {
                "role": "user",
                "parts": [
                    {"text": "You are a helpful assistant that helps people find information about FMCG sales data."}
                ]
            },
            {
                "role": "user",
                "parts": [
                    {"text": base_system_prompt}
                ]
            }
        ]

    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt
    )
    return {
        "type": "text",
        "message": response.text
    }

def validate_sql(sql: str):
    if not sql:
        raise ValueError("Empty SQL generated")

    sql = sql.strip()

    if sql.endswith(";"):
        sql = sql[:-1]

    lower = sql.lower()

    if not lower.startswith("select"):
        raise ValueError("Only SELECT queries are allowed")

    forbidden = ["insert", "update", "delete", "drop"]
    if any(k in lower for k in forbidden):
        raise ValueError("Unsafe SQL detected")

    if "count(" not in lower and "sum(" not in lower and "avg(" not in lower:
        if "limit" not in lower:
            sql += " LIMIT 1000"

    return sql

@app.post("/chatbot")
def chatbot(
    request: dict,
    db: Session = Depends(get_db)
):
    message = request.get("message", "")

    prompt = f"""
    You are a smart and friendly Sales Demand Consulting Assistant of the DOM Team. 
    You are a senior data analyst.
    You write PostgreSQL queries.

    Rules:
    - Generate ONLY ONE SQL query
    - Use SELECT only
    - Never modify data
    - Do not explain
    - Use table: sales_fact
    - Always use LIMIT if result can be large
    - Do NOT use SELECT * because there are too many columns
    - Always select only necessary columns
    - If using aggregation (SUM, AVG, COUNT), include proper GROUP BY

    This is the schema of the data you have to work with:
    Database: sales_fact (fact table – daily sales)

    Grain:
    - 1 row = 1 SKU sold in 1 store on 1 day
    Primary key: (date, store_id, sku_id)

    Time columns:
    - date (DATE)
    - year, month, day
    - weekofyear
    - weekday (1–7)
    - is_weekend (boolean)
    - is_holiday (boolean)

    Weather:
    - temperature (°C)
    - rain_mm

    Store:
    - store_id
    - country
    - city
    - channel (online, offline, etc.)
    - latitude, longitude

    Product:
    - sku_id
    - sku_name
    - category
    - subcategory
    - brand

    Sales:
    - units_sold
    - list_price
    - discount_pct
    - promo_flag
    - gross_sales
    - net_sales

    Inventory:
    - stock_opening
    - stock_on_hand
    - stock_out_flag
    - replenishment_units
    - lead_time_days

    Supplier:
    - supplier_id
    - purchase_cost
    - margin_pct

    Here is the user question:
    {message}
    """

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    )

    raw_sql = response.text or ""
    query = (
        raw_sql
        .replace("```sql", "")
        .replace("```", "")
        .strip()
    )
    try:
        query = validate_sql(query)
    except Exception as e:
        return {
            "code": "error",
            "message": f"Invalid SQL generated: {str(e)}",
            "raw_sql": raw_sql
        }
    
    try:
        rows = db.execute(text(query)).fetchall()
        result = [dict(row._mapping) for row in rows]
    except Exception as e:
        return {
            "code": "error",
            "message": "SQL execution failed",
            "query": query,
            "error": str(e)
        }
    
    answer_prompt = f"""
    You are a smart and friendly Sales Demand Consulting Assistant of the DOM Team. 
    You are a senior data analyst.
    Based on the following SQL query result, provide a concise answer to the user's question.
    Do not repeat the SQL or the result back to the user.
    SQL Query:  
    {query}
    SQL Result:
    {result}
    User Question:
    {message}
    Provide a concise answer in less than 200 words.
    Do not use any special formatting.
    Do not mention you are an AI model.
    Do not repeat the context back to the user or repeat your flow of thought.
    Do not use any markdown formatting.
    """

    answer_response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": answer_prompt}
                ]
            }
        ]
    )

    return {
        "code": "success",
        "message": "Chat successful!",
        "data": {
            "answer": answer_response.text,
            "query": query,
        }
    }

# ==================== CHANNEL ANALYTICS ====================

@app.get('/channel/list')
def get_channel_list(db: Session = Depends(get_db)):
    """Get all available sales channels."""
    channels = db.query(SalesFact.channel).distinct().all()
    result = [c[0] for c in channels if c[0] is not None]
    return {"data": result}

@app.get('/analytics/channel')
async def get_channel_analytics(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month"),
):
    """Get detailed channel performance analytics."""
    cache_key = f"channel_analytics:{country}:{year}:{month}"

    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.channel,
        func.sum(SalesFact.net_sales).label("total_sales"),
        func.sum(SalesFact.units_sold).label("total_units"),
        func.count(func.distinct(SalesFact.store_id)).label("store_count"),
        func.count(func.distinct(SalesFact.sku_id)).label("product_count"),
        func.avg(SalesFact.discount_pct).label("avg_discount"),
        func.sum(case((SalesFact.promo_flag == True, literal(1)), else_=literal(0))).label("promo_transactions"),
        func.sum(case((SalesFact.stock_out_flag == True, literal(1)), else_=literal(0))).label("stockout_count"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.channel).all()
    
    total_sales = sum(float(r.total_sales or 0) for r in rows)
    
    result = {
        "data": [
            {
                "channel": r.channel,
                "sales": float(r.total_sales or 0),
                "units": int(r.total_units or 0),
                "stores": int(r.store_count or 0),
                "products": int(r.product_count or 0),
                "sales_pct": round((float(r.total_sales or 0) / total_sales * 100), 2) if total_sales > 0 else 0,
                "avg_discount_pct": round(float(r.avg_discount or 0), 2),
                "promo_transactions": int(r.promo_transactions or 0),
                "stockout_count": int(r.stockout_count or 0),
            }
            for r in rows
        ],
        "summary": {
            "total_sales": round(total_sales, 2),
            "channels_count": len(rows)
        }
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
    }

@app.get('/analytics/channel/daily')
async def get_channel_daily_sales(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    channel: str = Query("all", description="Filter by channel"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month"),
):
    """Get daily sales trend by channel."""
    cache_key = f"channel_daily_sales:{country}:{channel}:{year}:{month}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.date,
        SalesFact.channel,
        func.sum(SalesFact.net_sales).label("sales"),
        func.sum(SalesFact.units_sold).label("units"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if channel != "all":
        query = query.filter(SalesFact.channel == channel)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.date, SalesFact.channel).order_by(SalesFact.date).all()
    
    result = {
        "data": [
            {
                "date": r.date,
                "channel": r.channel,
                "sales": float(r.sales or 0),
                "units": int(r.units or 0),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result, default=str),
    
    )

    return {
        "source": "db",
        **result
    }

# ==================== PRICE & DISCOUNT ANALYTICS ====================

@app.get('/analytics/pricing')
async def get_pricing_analytics(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month"),
):
    """Get pricing and discount effectiveness analysis."""
    cache_key = f"pricing_analytics:{country}:{year}:{month}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.category,
        func.avg(SalesFact.list_price).label("avg_list_price"),
        func.avg(SalesFact.discount_pct).label("avg_discount_pct"),
        func.sum(SalesFact.net_sales).label("total_sales"),
        func.sum(SalesFact.gross_sales).label("total_gross_sales"),
        func.sum(SalesFact.units_sold).label("total_units"),
        func.avg(SalesFact.margin_pct).label("avg_margin_pct"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.category).all()
    
    result = {
        "data": [
            {
                "category": r.category,
                "avg_list_price": round(float(r.avg_list_price or 0), 2),
                "avg_discount_pct": round(float(r.avg_discount_pct or 0), 2),
                "price_realization": round((float(r.total_sales or 0) / float(r.total_gross_sales or 1)), 4),
                "total_sales": round(float(r.total_sales or 0), 2),
                "total_units": int(r.total_units or 0),
                "avg_margin_pct": round(float(r.avg_margin_pct or 0), 2),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )   

    return {
        "source": "db",
        **result
    }

@app.get('/analytics/discount-impact')
async def get_discount_impact(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
):
    """Analyze discount effectiveness on units sold."""
    cache_key = f"discount_impact:{country}:{year}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }
    # Compare discounted vs non-discounted sales
    query = db.query(
        SalesFact.category,
        func.sum(case((SalesFact.discount_pct > 0, SalesFact.units_sold), else_=0)).label("units_discounted"),
        func.sum(case((SalesFact.discount_pct > 0, SalesFact.net_sales), else_=0)).label("sales_discounted"),
        func.sum(case((SalesFact.discount_pct == 0, SalesFact.units_sold), else_=0)).label("units_no_discount"),
        func.sum(case((SalesFact.discount_pct == 0, SalesFact.net_sales), else_=0)).label("sales_no_discount"),
        func.count(case((SalesFact.discount_pct > 0, 1))).label("transaction_count_discounted"),
        func.count(case((SalesFact.discount_pct == 0, 1))).label("transaction_count_no_discount"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    
    rows = query.group_by(SalesFact.category).all()
    
    result = {
        "data": [
            {
                "category": r.category,
                "units_with_discount": int(r.units_discounted or 0),
                "units_without_discount": int(r.units_no_discount or 0),
                "units_lift_pct": round(((int(r.units_discounted or 0) - int(r.units_no_discount or 0)) / max(int(r.units_no_discount or 1), 1) * 100), 2),
                "sales_with_discount": round(float(r.sales_discounted or 0), 2),
                "sales_without_discount": round(float(r.sales_no_discount or 0), 2),
                "transaction_count_discounted": int(r.transaction_count_discounted or 0),
                "transaction_count_no_discount": int(r.transaction_count_no_discount or 0),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )   

    return {
        "source": "db",
        **result
    }

# ==================== SUPPLIER ANALYTICS ====================

@app.get('/supplier/list')
def get_supplier_list(db: Session = Depends(get_db)):
    """Get all suppliers."""
    suppliers = db.query(SalesFact.supplier_id).distinct().all()
    result = [s[0] for s in suppliers if s[0] is not None]
    return {"data": result}

@app.get('/analytics/supplier')
async def get_supplier_performance(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
):
    """Analyze supplier performance and costs."""
    cache_key = f"supplier_performance:{country}:{year}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.supplier_id,
        func.count(func.distinct(SalesFact.sku_id)).label("products_supplied"),
        func.sum(SalesFact.units_sold).label("total_units"),
        func.sum(SalesFact.purchase_cost * SalesFact.units_sold).label("total_cost"),
        func.sum(SalesFact.net_sales).label("total_sales"),
        func.avg(SalesFact.lead_time_days).label("avg_lead_time"),
        func.avg(SalesFact.margin_pct).label("avg_margin_pct"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    
    rows = query.group_by(SalesFact.supplier_id).all()
    
    result = {
        "data": [
            {
                "supplier_id": r.supplier_id,
                "products_supplied": int(r.products_supplied or 0),
                "total_units": int(r.total_units or 0),
                "total_cost": round(float(r.total_cost or 0), 2),
                "total_sales": round(float(r.total_sales or 0), 2),
                "profit": round(float((r.total_sales or 0) - (r.total_cost or 0)), 2),
                "avg_lead_time_days": round(float(r.avg_lead_time or 0), 1),
                "avg_margin_pct": round(float(r.avg_margin_pct or 0), 2),
                "cost_per_unit": round(float((r.total_cost or 0) / max(r.total_units or 1, 1)), 2),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )   

    return {
        "source": "db",
        **result
    }

# ==================== WEATHER CORRELATION ====================

@app.get('/analytics/weather-correlation')
async def get_weather_correlation(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
    month: str = Query("all", description="Filter by month"),
):
    """Analyze correlation between weather and sales."""
    cache_key = f"weather_correlation:{country}:{year}:{month}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    query = db.query(
        SalesFact.date,
        func.avg(SalesFact.temperature).label("avg_temp"),
        func.sum(SalesFact.rain_mm).label("total_rain"),
        func.sum(SalesFact.units_sold).label("units_sold"),
        func.sum(SalesFact.net_sales).label("net_sales"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    if month != "all":
        query = query.filter(func.extract("month", SalesFact.date) == int(month))
    
    rows = query.group_by(SalesFact.date).order_by(SalesFact.date).all()
    
    result = {
        "data": [
            {
                "date": r.date,
                "temperature": round(float(r.avg_temp or 0), 1),
                "rain_mm": round(float(r.total_rain or 0), 2),
                "units_sold": int(r.units_sold or 0),
                "sales": round(float(r.net_sales or 0), 2),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result, default=str),
    
    )

    return {
        "source": "db",
        **result
    }

@app.get('/analytics/weather-by-category')
async def get_weather_category_analysis(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
):
    """Analyze weather impact by product category."""
    cache_key = f"weather_by_category:{country}:{year}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    # Segment by temperature ranges
    query = db.query(
        SalesFact.category,
        case(
            (SalesFact.temperature < 10, "Cold (<10°C)"),
            (SalesFact.temperature < 20, "Cool (10-20°C)"),
            (SalesFact.temperature < 30, "Warm (20-30°C)"),
            else_="Hot (>30°C)"
        ).label("temp_segment"),
        func.sum(SalesFact.units_sold).label("units"),
        func.sum(SalesFact.net_sales).label("sales"),
        func.count().label("record_count"),
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    
    rows = query.group_by(SalesFact.category, "temp_segment").all()
    
    result = {
        "data": [
            {
                "category": r.category,
                "temperature_segment": r.temp_segment,
                "units": int(r.units or 0),
                "sales": round(float(r.sales or 0), 2),
                "avg_sales_per_transaction": round(float((r.sales or 0) / max(r.record_count or 1, 1)), 2),
            }
            for r in rows
        ]
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
    }

# ==================== INVENTORY OPTIMIZATION ====================

@app.get('/analytics/inventory-optimization')
async def get_inventory_optimization(
    db: Session = Depends(get_db),
    country: str = Query("all", description="Filter by country"),
    year: str = Query("all", description="Filter by year"),
):
    """Get inventory optimization metrics and recommendations."""
    cache_key = f"inventory_optimization:{country}:{year}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return {
            "source": "redis",
            **cached_data
        }

    # Get latest inventory status for each SKU-Store
    latest_records = db.query(
        SalesFact.sku_id,
        SalesFact.store_id,
        func.max(SalesFact.date).label("latest_date")
    ).group_by(SalesFact.sku_id, SalesFact.store_id).subquery()
    
    query = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name,
        SalesFact.store_id,
        SalesFact.stock_on_hand,
        SalesFact.stock_opening,
        SalesFact.lead_time_days,
        func.avg(SalesFact.units_sold).label("avg_daily_sales"),
        func.sum(SalesFact.units_sold).label("total_units_sold"),
    ).join(
        latest_records,
        (SalesFact.sku_id == latest_records.c.sku_id) &
        (SalesFact.store_id == latest_records.c.store_id) &
        (SalesFact.date == latest_records.c.latest_date)
    )
    
    if country != "all":
        query = query.filter(SalesFact.country == country)
    if year != "all":
        query = query.filter(func.extract("year", SalesFact.date) == int(year))
    
    rows = query.group_by(
        SalesFact.sku_id, SalesFact.sku_name, SalesFact.store_id,
        SalesFact.stock_on_hand, SalesFact.stock_opening, SalesFact.lead_time_days
    ).limit(500).all()
    
    inventory_data = []
    for row in rows:
        avg_daily = float(row.avg_daily_sales or 1)
        lead_time = float(row.lead_time_days or 7)
        safety_stock = int(row.stock_opening or 0)
        current_stock = int(row.stock_on_hand or 0)
        
        # Calculate reorder point = (avg_daily_sales * lead_time) + safety_stock
        reorder_point = int((avg_daily * lead_time) + (safety_stock * 0.5))
        
        # Calculate days of stock
        days_of_stock = current_stock / avg_daily if avg_daily > 0 else 0
        
        # Determine recommendation
        if current_stock <= reorder_point:
            recommendation = "Order Now"
            priority = "High"
        elif days_of_stock < lead_time * 1.5:
            recommendation = "Plan Replenishment"
            priority = "Medium"
        else:
            recommendation = "Optimal"
            priority = "Low"
        
        inventory_data.append({
            "sku_id": row.sku_id,
            "sku_name": row.sku_name,
            "store_id": row.store_id,
            "current_stock": current_stock,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "days_of_stock": round(days_of_stock, 1),
            "avg_daily_sales": round(avg_daily, 1),
            "lead_time_days": lead_time,
            "recommendation": recommendation,
            "priority": priority,
        })
    
    result = {
        "data": inventory_data,
        "summary": {
            "high_priority_count": sum(1 for i in inventory_data if i["priority"] == "High"),
            "medium_priority_count": sum(1 for i in inventory_data if i["priority"] == "Medium"),
            "optimal_count": sum(1 for i in inventory_data if i["priority"] == "Low"),
        }
    }

    await redis_client.set(
        cache_key,
        json.dumps(result),
    
    )

    return {
        "source": "db",
        **result
    }

EPSILON = 0.0001
N_DAYS = 7

MIN_DATE = datetime(2021, 1, 1).date()
MAX_DATE = datetime(2023, 12, 31).date()

safety_stock = 2
preview_days = 7

@app.get("/sku/list")
async def get_top_skus(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    date: str = Query(..., description="YYYY-MM-DD"),
    store_id: str = Query("all", description="Filter by Store ID"),
    city: str = Query("all", description="Filter by City")
):
    # --- Validate date ---
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if target_date > MAX_DATE or target_date < MIN_DATE:
        return {
            "code": "error",
            "message": "Data is only available up to 2023-12-31",
            "data": [],
            "pagination": {"page": page, "limit": limit, "total_count": 0, "total_pages": 0}
        }

    # --- Redis cache ---
    cache_key = f"list_skus:{limit}:{page}:{date}:{store_id}:{city}"
    cached = await redis_client.get(cache_key)
    if cached:
        return {"source": "redis", **json.loads(cached)}

    # --- Lấy tổng units_sold và stock_on_hand theo SKU ---
    query = db.query(
        SalesFact.sku_id,
        SalesFact.sku_name,
        SalesFact.category,
        SalesFact.brand,
        SalesFact.store_id,
        SalesFact.city,
        SalesFact.lead_time_days,
        SalesFact.list_price,
        func.sum(SalesFact.units_sold).label("total_units_sold"),
        func.max(SalesFact.stock_on_hand).label("stock_on_hand"),
    ).filter(
        SalesFact.date == target_date,
    ).group_by(
        SalesFact.sku_id,
        SalesFact.sku_name,
        SalesFact.category,
        SalesFact.brand,
        SalesFact.store_id,
        SalesFact.city,
        SalesFact.lead_time_days,
        SalesFact.list_price
    )

    if store_id != "all":
        query = query.filter(SalesFact.store_id == store_id)
    if city != "all":
        query = query.filter(SalesFact.city == city)

    total_count = query.count()
    skus = query.offset((page - 1) * limit).limit(limit).all()

    if not skus:
        return {
            "code": "success",
            "message": "No SKUs found",
            "data": [],
            "pagination": {"page": page, "limit": limit, "total_count": 0, "total_pages": 0}
        }

    # Tạo list SKU keys để tính avg daily tổng
    sku_keys = [(r.sku_id, r.category, r.brand, r.store_id, r.city) for r in skus]

    avg_demand_query = (
        db.query(
            SalesFact.sku_id,
            SalesFact.store_id,
            SalesFact.category,
            SalesFact.brand,
            SalesFact.city,
            (func.sum(SalesFact.units_sold) / N_DAYS).label("avg_daily_demand")
        )
        .filter(
            SalesFact.date > target_date,
            SalesFact.date <= target_date + timedelta(days=N_DAYS),
            tuple_(
                SalesFact.sku_id,
                SalesFact.category,
                SalesFact.brand,
                SalesFact.store_id,
                SalesFact.city
            ).in_(sku_keys)
        )
        .group_by(
            SalesFact.sku_id,
            SalesFact.category,
            SalesFact.brand,
            SalesFact.store_id,
            SalesFact.city
        )
        .all()
    )

    avg_demand_map = {
        (r.sku_id, r.category, r.brand, r.store_id, r.city): float(r.avg_daily_demand or EPSILON)
        for r in avg_demand_query
    }

    result_data = []
    for r in skus:
        key = (r.sku_id, r.category, r.brand, r.store_id, r.city)
        avg_daily = avg_demand_map.get(key, EPSILON)
        doc = r.stock_on_hand / max(avg_daily, EPSILON)

        result_data.append({
            "sku_id": r.sku_id,
            "sku_name": r.sku_name,
            "category": r.category,
            "brand": r.brand,
            "store_id": r.store_id,
            "city": r.city,
            "total_units_sold": int(r.total_units_sold or 0),  # sales trong ngày target
            "stock_on_hand": int(r.stock_on_hand or 0),        # tồn kho tại target_date
            "avg_daily_demand": round(avg_daily, 2),           # optional nhưng rất nên có
            "doc": round(doc, 2),
            "rop": round(
                max(avg_daily, EPSILON) * (r.lead_time_days + safety_stock + preview_days),
                2
            ),
            "day_until_order": round(
                doc - (r.lead_time_days + safety_stock + preview_days),
                2
            ),
            "average_daily_sales": round(avg_daily, 2),
            "lead_time_days": r.lead_time_days,
            "list_price": round(float(r.list_price or 0), 2),
        })

    result = {
        "code": "success",
        "message": "Top SKUs retrieved successfully",
        "data": result_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }

    await redis_client.set(cache_key, json.dumps(result))
    return {"source": "db", **result}
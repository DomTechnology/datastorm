from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal
from .model.sales_fact import SalesFact
from .utils.db import get_db
from fastapi.middleware.cors import CORSMiddleware
import httpx
from datetime import datetime
import os
from google import genai

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
    Keep answers under 200 words. Use natural, professional English. 
    Do not use any special formatting.
    Do not mention you are an AI model.
    Do not repeat the context back to the user or repeat your flow of thought.
    Give suggestion for optimal sales demand planning and inventory management.
    Do not use any markdown formatting.

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
    Keep answers under 200 words. Use natural, professional English. 
    Do not use any special formatting.
    Do not mention you are an AI model.
    Do not repeat the context back to the user or repeat your flow of thought.
    Give suggestions to reduce lead time and improve supply chain efficiency.
    Do not use any markdown formatting.

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
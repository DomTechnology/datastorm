from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class SalesFact(Base):
    __tablename__ = "sales_fact"

    date = Column(Date, primary_key=True, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    day = Column(Integer, nullable=False)
    weekofyear = Column(Integer, nullable=False)
    weekday = Column(Integer, nullable=False)
    is_weekend = Column(Boolean, nullable=False)
    is_holiday = Column(Boolean, nullable=False)

    temperature = Column(Numeric(5, 2))
    rain_mm = Column(Numeric(6, 2))

    store_id = Column(String(20), primary_key=True, nullable=False)
    country = Column(String(50))
    city = Column(String(50))
    channel = Column(String(50))
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))

    sku_id = Column(String(20), primary_key=True, nullable=False)
    sku_name = Column(String(100))
    category = Column(String(50))
    subcategory = Column(String(50))
    brand = Column(String(50))

    units_sold = Column(Integer, nullable=False)
    list_price = Column(Numeric(10, 2), nullable=False)
    discount_pct = Column(Numeric(5, 2))
    promo_flag = Column(Boolean, nullable=False)

    gross_sales = Column(Numeric(12, 2))
    net_sales = Column(Numeric(12, 2))

    stock_on_hand = Column(Integer)
    stock_out_flag = Column(Boolean, nullable=False)
    lead_time_days = Column(Integer)

    supplier_id = Column(String(20))
    purchase_cost = Column(Numeric(10, 2))
    margin_pct = Column(Numeric(5, 3))
    stock_opening = Column(Integer)
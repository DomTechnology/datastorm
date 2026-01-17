# Backend API Routes

This document lists all the available API routes for the backend service.

## General

- `GET /information`: Get general information about the data.
- `GET /country`: Get a list of all countries.
- `GET /store/list`: Get a list of all stores.
- `GET /city/list`: Get a list of all cities.
- `GET /category/list`: Get a list of all categories.
- `GET /brand/list`: Get a list of all brands.
- `GET /product/list`: Get a list of all products.
- `GET /detail`: Get detailed information for a specific sales fact.
- `GET /channel/list`: Get all available sales channels.
- `GET /supplier/list`: Get all suppliers.

## Sales

- `GET /net_sales/daily`: Get daily net sales.
- `GET /unit_sold/daily`: Get daily units sold.
- `GET /net_sales/category`: Get net sales by category.
- `GET /unit_sold/holiday_weekday`: Get units sold statistics for holidays and weekdays.
- `GET /unit_sold/promo`: Get units sold with and without promotion.
- `GET /net_sales/location`: Get net sales by location.

## SKU

- `GET /sku/top`: Get top selling SKUs.
- `GET /sku/list`: Get a list of SKUs with pagination.

## Stock

- `GET /stock_alerts`: Get stock alerts for items below safety stock levels.

## Analytics

- `GET /analytics/revenue`: Get revenue analytics with trends and breakdown.
- `GET /analytics/profit`: Get profit margin analytics by category and time period.
- `GET /analytics/kpi`: Get key performance indicators for the business.
- `GET /analytics/channel`: Get detailed channel performance analytics.
- `GET /analytics/channel/daily`: Get daily sales trend by channel.
- `GET /analytics/pricing`: Get pricing and discount effectiveness analysis.
- `GET /analytics/discount-impact`: Analyze discount effectiveness on units sold.
- `GET /analytics/supplier`: Analyze supplier performance and costs.
- `GET /analytics/weather-correlation`: Analyze correlation between weather and sales.
- `GET /analytics/weather-by-category`: Analyze weather impact by product category.
- `GET /analytics/inventory-optimization`: Get inventory optimization metrics and recommendations.

## AI / ML

- `POST /predict_7days`: Predict 7-day demand and lead time forecast.
- `POST /suggestion/sales_demand`: Get sales demand suggestions.
- `POST /suggestion/lead_time`: Get lead time suggestions.
- `POST /chatbot`: Chatbot for answering questions about the data.

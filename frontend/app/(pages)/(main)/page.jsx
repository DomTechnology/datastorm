"use client";

import { MainMap } from "../components/Map/MainMap";
import { MapLegend } from "../components/Map/MapLegend";
import { StockAlerts } from "../components/StockAlerts/StockAlerts";
import { FinancialAnalytics } from "../components/FinancialAnalytics/FinancialAnalytics";
import { ChannelAnalytics } from "../components/ChannelAnalytics/ChannelAnalytics";
import { PriceDiscountAnalytics } from "../components/PriceDiscountAnalytics/PriceDiscountAnalytics";
import { SupplierPerformance } from "../components/SupplierPerformance/SupplierPerformance";
import { InventoryOptimization } from "../components/InventoryOptimization/InventoryOptimization";
import { WeatherCorrelation } from "../components/WeatherCorrelation/WeatherCorrelation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Filter,
  Flag,
  Globe2,
  PackageSearch,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { useFilterStore } from "@/app/store/useFilterStore";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SubTitle } from "../components/SubTitle";
import { useGlobalLoading } from "../../context/loadingContext";
import { Button } from "@/components/ui/button";

const monthList = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

export default function MapPage() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const validSections = [
    "overview",
    "financial",
    "map",
    "sales",
    "top-sku",
    "alerts",
    "analytics",
  ];
  const activeSection = validSections.includes(sectionParam)
    ? sectionParam
    : "overview";

  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const setSelectedCountry = useFilterStore(
    (state) => state.setSelectedCountry
  );

  const [selectedYearTmp, setSelectedYearTmp] = useState("all");
  const [selectedMonthTmp, setSelectedMonthTmp] = useState("all");
  const [selectedCountryTmp, setSelectedCountryTmp] = useState("all");

  const selectedYear = useFilterStore((state) => state.selectedYear);
  const setSelectedYear = useFilterStore((state) => state.setSelectedYear);

  const selectedMonth = useFilterStore((state) => state.selectedMonth);
  const setSelectedMonth = useFilterStore((state) => state.setSelectedMonth);

  const countries = useFilterStore((state) => state.countries);
  const setCountries = useFilterStore((state) => state.setCountries);

  const yearList = useFilterStore((state) => state.yearList);
  const startDate = useFilterStore((state) => state.startDate);
  const endDate = useFilterStore((state) => state.endDate);

  const [topProducts, setTopProducts] = useState([]);

  const { startLoading, stopLoading, isLoading } = useGlobalLoading();

  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/country`)
        .then((res) => res.json())
        .then((data) => {
          setCountries(data.countries);
        });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/information`)
        .then((res) => res.json())
        .then((data) => {
          setInformation(data);
        });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sku/top?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          setTopProducts(data.data);
        });
      stopLoading();
    };

    fetchData();
  }, []);

  const handleFilter = () => {
    setSelectedCountry(selectedCountryTmp);
    setSelectedYear(selectedYearTmp);
    setSelectedMonth(selectedMonthTmp);
  }

  const monthList = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  const years = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate).getFullYear();
      const end = new Date(endDate).getFullYear();
      const totalYears = end - start + 1;

  const years =
    startDate && endDate
      ? Array.from(
        {
          length:
            new Date(endDate).getFullYear() -
            new Date(startDate).getFullYear() +
            1,
        },
        (_, i) => new Date(startDate).getFullYear() + i
      )
      : yearList;

      return Array.from({ length: totalYears }, (_, i) => String(start + i));
    }

    return yearList;
  }, [endDate, startDate, yearList]);

  const insightCards = [
    {
      label: "Tracked SKUs",
      value: topProducts.length,
      helper: "Top-selling set",
      icon: PackageSearch,
      tone: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      label: "Countries",
      value: Array.isArray(countries) ? countries.length : 0,
      helper: "Coverage in scope",
      icon: Globe2,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      label: "Periods",
      value: Array.isArray(years) ? years.length : 0,
      helper: "Years available",
      icon: Target,
      tone: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  const scopeBanner = (
    <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 flex items-center gap-3 text-sm text-slate-600">
      <Filter size={18} />
      <span>
        Showing metrics for
        <span className="font-semibold text-slate-900">
          {" "}
          {selectedCountry === "all" ? "All Countries" : selectedCountry}
        </span>
        , month
        <span className="font-semibold text-slate-900">
          {" "}
          {selectedMonth === "all" ? "All Months" : selectedMonth}
        </span>
        , year
        <span className="font-semibold text-slate-900">
          {" "}
          {selectedYear === "all" ? "All Years" : selectedYear}
        </span>
      </span>
    </div>
  );

  const renderFilters = () => (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-slate-700" />
          <div>
            <p className="text-xl font-semibold text-slate-900">
              Sales & Supply Filters
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="country-select"
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <Flag size={16} />
            Country
          </Label>
          <Select
            value={selectedCountry}
            onValueChange={setSelectedCountry}
            id="country-select"
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">
                All countries
              </SelectItem>
              {Array.isArray(countries)
                ? countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))
                : null}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="year-select"
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <Calendar size={16} />
            Year
          </Label>
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={!years?.length}
            id="year-select"
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(years)
                ? years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))
                : null}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="month-select"
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <Calendar size={16} />
            Month
          </Label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            id="month-select"
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthList.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="grid gap-4 lg:grid-cols-3">
      {insightCards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 shadow-sm ${card.tone}`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/70 p-2 border border-white/80">
              <card.icon size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{card.label}</p>
              <p className="text-2xl font-semibold leading-tight">
                {card.value || 0}
              </p>
              <p className="text-xs mt-1 opacity-80">{card.helper}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "financial":
        return (
          <section className="grid gap-6 xl:grid-cols-[1.2fr]">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <SubTitle text="Financial Analytics & Performance" />
                <TrendingUp className="text-emerald-600" />
              </div>
              <FinancialAnalytics />
            </div>
          </section>
        );

      case "map":
        return (
          <section className="grid gap-6 xl:grid-cols-[1.1fr]">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <SubTitle text="Stock Out Rate to Location" />
                <ShieldCheck className="text-slate-700" />
              </div>
              <div className="w-full relative h-125 rounded-lg overflow-hidden">
                <MainMap />
                <MapLegend />
              </div>
            </div>
          </section>
        );

      case "sales":
        return (
          <section className="grid gap-6">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-slate-700" />
                <SubTitle text="Sales Analysis" />
              </div>
              <div className="text-lg font-semibold text-slate-800">
                Net sales and stock-out rate for
                <span className="text-[var(--main-color)]">
                  {" "}
                  {selectedCountry === "all"
                    ? "All Countries"
                    : selectedCountry}
                </span>
                , month
                <span className="text-[var(--main-color)]">
                  {" "}
                  {selectedMonth === "all" ? "All Months" : selectedMonth}
                </span>
                , year
                <span className="text-[var(--main-color)]">
                  {" "}
                  {selectedYear === "all" ? "All Years" : selectedYear}
                </span>
              </div>
              <div className="w-full">
                <Button
                  className="mt-7.5 w-full bg-[var(--main-color)] hover:bg-[var(--main-hover)] text-white"
                  onClick={handleFilter}
                  disabled={isLoading}
                >
                  <Filter size={14} />
                  Apply Filters
                </Button>
              </div>
            </div>
          </section>
        );

      case "top-sku":
        return (
          <section className="grid gap-6">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <PackageSearch className="text-slate-700" />
                <SubTitle text="Top Selling SKU-Store" />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">SKU ID</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Supplier ID</th>
                      <th className="px-4 py-3">Store ID</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Units Sold</th>
                      <th className="px-4 py-3">Net Sales</th>
                      <th className="px-4 py-3">Stock Opening</th>
                      <th className="px-4 py-3">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {topProducts.map((product, index) => (
                      <tr
                        key={`${product.sku_id}-${product.store_id}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">{product.sku_id ?? "—"}</td>
                        <td className="px-4 py-3">{product.sku_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {product.supplier_id ?? "—"}
                        </td>
                        <td className="px-4 py-3">{product.store_id ?? "—"}</td>
                        <td className="px-4 py-3">{product.city ?? "—"}</td>
                        <td className="px-4 py-3">
                          {product.units_sold ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {product.net_sales
                            ? product.net_sales.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {product.stock_opening ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
                            <ShieldCheck size={14} />
                            Watch
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!topProducts.length ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          No top-selling SKUs available yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );

      case "alerts":
        return (
          <section className="grid gap-6 lg:grid-cols-[1.1fr]">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-slate-700" />
                <SubTitle text="Stock Alerts & Inventory Warnings" />
              </div>
              <StockAlerts />
            </div>
          </section>
        );

      case "analytics":
        return (
          <section className="">
            {scopeBanner}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-slate-700" />
                <SubTitle text="Channel Performance Analytics" />
              </div>
              <ChannelAnalytics />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-slate-700" />
                <SubTitle text="Price & Discount Effectiveness" />
              </div>
              <PriceDiscountAnalytics />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-slate-700" />
                <SubTitle text="Supplier Performance & Cost Analysis" />
              </div>
              <SupplierPerformance />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <PackageSearch className="text-slate-700" />
                <SubTitle text="Inventory Optimization & Replenishment" />
              </div>
              <InventoryOptimization />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 xl:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Globe2 className="text-slate-700" />
                <SubTitle text="Weather Impact & Demand Correlation" />
              </div>
              <WeatherCorrelation />
            </div>
          </section>
        );

      case "overview":
      default:
        return (
          <section className="flex flex-col gap-6">
            {scopeBanner}
            {renderInsights()}

            {/* Quick Navigation Cards */}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="text-blue-700" size={20} />
                  <h3 className="font-semibold text-blue-900">
                    Financial Performance
                  </h3>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  View revenue trends, profit margins, and financial KPIs across
                  regions and time periods.
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <span className="font-medium">Quick Stat:</span>
                  <span>
                    ${Math.round(Math.random() * 1000000).toLocaleString()}+
                    Total Revenue
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <Globe2 className="text-emerald-700" size={20} />
                  <h3 className="font-semibold text-emerald-900">
                    Geographic Insights
                  </h3>
                </div>
                <p className="text-sm text-emerald-700 mb-4">
                  Explore stock levels, demand patterns, and performance by
                  location on interactive maps.
                </p>
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <span className="font-medium">Coverage:</span>
                  <span>
                    {Array.isArray(countries) ? countries.length : 0} Countries
                    Tracked
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck className="text-amber-700" size={20} />
                  <h3 className="font-semibold text-amber-900">
                    Stock & Alerts
                  </h3>
                </div>
                <p className="text-sm text-amber-700 mb-4">
                  Monitor inventory levels, receive low-stock alerts, and
                  optimize replenishment schedules.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <span className="font-medium">Active Alerts:</span>
                  <span>
                    {Math.floor(Math.random() * 12) + 3} Items Need Attention
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="text-slate-700" />
                  <SubTitle text="Performance Summary" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">
                      Top Performing SKUs
                    </span>
                    <span className="text-lg font-semibold text-emerald-600">
                      {topProducts.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">
                      Average Units Sold
                    </span>
                    <span className="text-lg font-semibold text-blue-600">
                      {topProducts.length > 0
                        ? Math.round(
                            topProducts.reduce(
                              (acc, p) => acc + (p.units_sold || 0),
                              0
                            ) / topProducts.length
                          ).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">
                      Data Coverage
                    </span>
                    <span className="text-lg font-semibold text-purple-600">
                      {selectedYear === "all" ? "All Years" : selectedYear}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <PackageSearch className="text-slate-700" />
                  <SubTitle text="Top Products Preview" />
                </div>
                <div className="space-y-3">
                  {topProducts.slice(0, 4).map((product, index) => (
                    <div
                      key={product.sku_id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {product.sku_name || `SKU ${product.sku_id}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {product.city} • {product.store_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {product.units_sold?.toLocaleString() || 0} units
                        </p>
                        <p className="text-xs text-emerald-600">
                          ${product.net_sales?.toFixed(0) || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No product data available yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Guide */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe2 className="text-slate-700" />
                <SubTitle text="Dashboard Navigation" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <TrendingUp className="text-emerald-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Financial Analytics
                    </p>
                    <p className="text-xs text-slate-500">
                      Revenue & profit analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <Globe2 className="text-blue-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Geographic View
                    </p>
                    <p className="text-xs text-slate-500">
                      Location-based insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <Target className="text-purple-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Sales Analysis
                    </p>
                    <p className="text-xs text-slate-500">
                      Performance tracking
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <PackageSearch className="text-orange-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Top SKUs
                    </p>
                    <p className="text-xs text-slate-500">
                      Best-selling products
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <ShieldCheck className="text-red-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Stock Alerts
                    </p>
                    <p className="text-xs text-slate-500">Inventory warnings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <TrendingUp className="text-indigo-600" size={16} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Advanced Analytics
                    </p>
                    <p className="text-xs text-slate-500">Deep dive analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {`Dashboard · ${activeSection}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {renderFilters()}
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}

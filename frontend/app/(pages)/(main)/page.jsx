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
import { TopSKUProduct } from "../components/TopSKUProduct/TopSKUProduct";

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

  const { startLoading, stopLoading, isLoading } = useGlobalLoading();

  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/country`)
        .then((res) => res.json())
        .then((data) => {
          setCountries(data.countries);
        });
      stopLoading();
    };

    fetchData();
  }, []);

  const handleFilter = () => {
    setSelectedCountry(selectedCountryTmp);
    setSelectedYear(selectedYearTmp);
    setSelectedMonth(selectedMonthTmp);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="country-select"
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <Flag size={16} />
            Country
          </Label>
          <Select
            value={selectedCountryTmp}
            onValueChange={setSelectedCountryTmp}
            id="country-select"
            disabled={!countries?.length || isLoading}
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
            value={selectedYearTmp}
            onValueChange={setSelectedYearTmp}
            disabled={!years?.length || isLoading}
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
            value={selectedMonthTmp}
            onValueChange={setSelectedMonthTmp}
            id="month-select"
            disabled={isLoading}
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
    </div>
  );

  // const renderInsights = () => (
  //   <div className="grid gap-4 lg:grid-cols-3">
  //     {insightCards.map((card) => (
  //       <div
  //         key={card.label}
  //         className={`rounded-xl border p-4 shadow-sm ${card.tone}`}
  //       >
  //         <div className="flex items-center gap-3">
  //           <div className="rounded-full bg-white/70 p-2 border border-white/80">
  //             <card.icon size={18} />
  //           </div>
  //           <div className="flex-1">
  //             <p className="text-sm font-semibold">{card.label}</p>
  //             <p className="text-2xl font-semibold leading-tight">
  //               {card.value || 0}
  //             </p>
  //             <p className="text-xs mt-1 opacity-80">{card.helper}</p>
  //           </div>
  //         </div>
  //       </div>
  //     ))}
  //   </div>
  // );

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

      // case "sales":
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
            {/* {scopeBanner} */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <PackageSearch className="text-slate-700" />
                <SubTitle text="Top Selling SKU-Store" />
              </div>

              <TopSKUProduct />
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
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mt-5">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-slate-700" />
                <SubTitle text="Channel Performance Analytics" />
              </div>
              <ChannelAnalytics />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mt-5">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-slate-700" />
                <SubTitle text="Price & Discount Effectiveness" />
              </div>
              <PriceDiscountAnalytics />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mt-5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-slate-700" />
                <SubTitle text="Supplier Performance & Cost Analysis" />
              </div>
              <SupplierPerformance />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mt-5">
              <div className="flex items-center gap-3 mb-4">
                <PackageSearch className="text-slate-700" />
                <SubTitle text="Inventory Optimization & Replenishment" />
              </div>
              <InventoryOptimization />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 xl:col-span-2 mt-5">
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
            {/* Welcome Section */}
            <div className="rounded-2xl bg-white border// border-slate-200// shadow-sm// p-6">
              <div className="text-center mb-8//">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">
                  Welcome to DataStorm Analytics Dashboard
                </h1>
                <p className="text-lg text-slate-600 max-w-4xl mx-auto">
                  Your comprehensive platform for FMCG sales analytics,
                  inventory management, and business intelligence. Navigate
                  through different sections to explore detailed insights and
                  make data-driven decisions.
                </p>
              </div>
            </div>

            {/* How to Use Guide */}
            <div className="rounded-2xl bg-white border// border-slate-200// shadow-sm// p-6">
              <div className="flex items-center gap-3 mb-6">
                <Globe2 className="text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-900">
                  How to Use This Dashboard
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      1
                    </span>
                    Choose Your Section
                  </h3>
                  <p className="text-slate-600 ml-8">
                    Use the navigation sidebar to select the analytics section
                    you want to explore. Each section provides specialized
                    insights for different business needs.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      2
                    </span>
                    Apply Filters
                  </h3>
                  <p className="text-slate-600 ml-8">
                    Most sections include filtering options to narrow down data
                    by country, year, month, or other relevant parameters.
                    Adjust filters to focus on specific metrics.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      3
                    </span>
                    Analyze Data
                  </h3>
                  <p className="text-slate-600 ml-8">
                    Interact with charts, tables, and visualizations. Hover over
                    elements for detailed information and use the insights to
                    make informed business decisions.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      4
                    </span>
                    Monitor Alerts
                  </h3>
                  <p className="text-slate-600 ml-8">
                    Keep an eye on stock alerts and inventory warnings to stay
                    ahead of potential supply chain issues and optimize your
                    operations.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Sections */}
            <div className="rounded-2xl bg-white border// border-slate-200// shadow-sm// p-6">
              <div className="flex items-center gap-3 mb-6">
                <Target className="text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-900">
                  Available Dashboard Sections
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <TrendingUp className="text-emerald-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Financial Analytics
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Comprehensive revenue analysis, profit margins, and
                      financial KPIs with trend visualization.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span> Revenue
                      trends, profit analysis, financial metrics
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <Globe2 className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Geographic View
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Interactive maps showing stock-out rates, demand patterns,
                      and performance by location.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span> Location
                      mapping, stock-out visualization
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <Target className="text-purple-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Sales Analysis
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Detailed sales performance tracking with filtering options
                      and trend analysis.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span> Sales
                      tracking, performance metrics
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <PackageSearch className="text-orange-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Top SKUs
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Best-selling products analysis with detailed store and
                      product performance data.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span> Product
                      rankings, sales data
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <ShieldCheck className="text-red-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Stock Alerts
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Real-time inventory warnings and stock alerts to prevent
                      supply chain disruptions.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span> Inventory
                      warnings, alert management
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <TrendingUp className="text-indigo-600 mt-1" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Advanced Analytics
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Deep-dive analysis including channel performance, pricing,
                      supplier metrics, and weather correlation.
                    </p>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Features:</span>{" "}
                      Multi-dimensional analytics, correlations
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-2xl bg-white border// border-slate-200// shadow-sm// p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Quick Tips for Better Analytics
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-50// rounded-lg p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Filter Strategically
                  </h4>
                  <p className="text-sm text-slate-600">
                    Start with broader filters and gradually narrow down to
                    specific time periods or regions for detailed insights.
                  </p>
                </div>
                <div className="bg-slate-50// rounded-lg p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Compare Periods
                  </h4>
                  <p className="text-sm text-slate-600">
                    Use different time ranges to identify seasonal patterns and
                    growth trends in your data.
                  </p>
                </div>
                <div className="bg-slate-50// rounded-lg p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Monitor KPIs
                  </h4>
                  <p className="text-sm text-slate-600">
                    Regularly check key performance indicators in the Financial
                    Analytics section for business health.
                  </p>
                </div>
                <div className="bg-slate-50// rounded-lg p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Stay Alert
                  </h4>
                  <p className="text-sm text-slate-600">
                    Keep the Stock Alerts section handy to prevent inventory
                    issues and maintain optimal stock levels.
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen// bg-slate-50//">
      <div className="container mx-auto px-6// py-10//">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p
              className={`${activeSection == "overview"
                  ? "hidden"
                  : "text-2xl font-semibold text-slate-900"
                }`}
            >
              {`Dashboard · ${activeSection}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {(activeSection !== "overview" && activeSection !== "top-sku") && renderFilters()}
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}

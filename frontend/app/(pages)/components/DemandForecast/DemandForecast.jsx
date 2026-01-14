"use client"

import { Title } from "./../Title"
import { Filter, Grid2X2, Package, ShoppingCart, Store } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
  Line,
  LineChart,
} from "recharts";
import { toast } from "sonner";
import { SubTitle } from "../SubTitle";
import { SuggestionBox } from "./SuggestionBox";
import { Button } from "@/components/ui/button";

export const DemandForecast = () => {
  const [storeList, setStoreList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [oldUnitSoldData, setOldUnitSoldData] = useState([]);

  useEffect(() => {
    const toastId = toast.loading("Loading filters...");
    const fetchData = async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/store/list`)
        .then((res) => res.json())
        .then((data) => {
          setStoreList(data.data);
        })
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/category/list`)
        .then((res) => res.json())
        .then((data) => {
          setCategoryList(data.data);
        });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brand/list`)
        .then((res) => res.json())
        .then((data) => {
          setBrandList(data.data);
        });
      toast.success("Filters loaded!", { id: toastId });
    };
    fetchData();
  }, []);

  const [selectedStore, setSelectedStore] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const [productList, setProductList] = useState([]);
  useEffect(() => {
    setProductList([]);
    if (selectedStore && selectedCategory && selectedBrand) {
      const toastId = toast.loading("Loading products...");
      const fetchProductList = async () => {
        let queryParams = [];
        if (selectedStore) {
          queryParams.push(`store=${encodeURIComponent(selectedStore)}`);
        }
        if (selectedCategory) {
          queryParams.push(`category=${encodeURIComponent(selectedCategory)}`);
        }
        if (selectedBrand) {
          queryParams.push(`brand=${encodeURIComponent(selectedBrand)}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/product/list${queryString}`)
          .then((res) => res.json())
          .then((data) => {
            setProductList(data.data);
            toast.success("Products loaded!", { id: toastId });
          });
      };
      fetchProductList();
    }
  }, [selectedStore, selectedCategory, selectedBrand]);

  const [predictedData, setPredictedData] = useState([]);
  const [predictedLeadTime, setPredictedLeadTime] = useState([]);
  const [fetchingPrediction, setFetchingPrediction] = useState(false);
  const handleFilter = () => {
    setSaleDemandSuggestion(null);
    setLeadTimeSuggestion(null);
    setPredictedData([]);
    setPredictedLeadTime([]);
    setOldUnitSoldData([]);
    const fetchPredictedData = async () => {
      if (
        !selectedStore ||
        !selectedProduct ||
        !selectedCategory ||
        !selectedBrand
      ) return;
      const toastId = toast.loading("Fetching demand forecast...");
      setFetchingPrediction(true);
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unit_sold/daily?country=all&year=2023&month=12&store=${encodeURIComponent(selectedStore)}&category=${encodeURIComponent(selectedCategory)}&brand=${encodeURIComponent(selectedBrand)}&sku_id=${encodeURIComponent(selectedProduct)}`)
        .then((res) => res.json())
        .then((data) => {
          setOldUnitSoldData(data.data);
        });
      try {
        const payload = {
          start_date: "2024-01-01",
          store_id: selectedStore,
          sku_id: selectedProduct,
          category: selectedCategory,
          brand: selectedBrand,
        };

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/predict_7days`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();

        toast.success("Demand forecast fetched successfully!", { id: toastId });
        const forecasts = data.data.daily_forecasts;

        const demandPredictions = forecasts.map(item => ({
          date: item.date,
          predicted_unit_sold: Number(item.demand.units_sold.toFixed(2)),
        }));

        const leadTimePredictions = forecasts.map(item => ({
          date: item.date,
          predicted_unit_sold: Number(item.supply.lead_time_days.toFixed(2)),
        }));

        setPredictedData(demandPredictions);
        setPredictedLeadTime(leadTimePredictions);
        setFetchingPrediction(false);
      } catch (err) {
        toast.error("Failed to fetch demand forecast.", { id: toastId });
        console.error("Prediction error:", err);
        setFetchingPrediction(false);
      }
    };
    fetchPredictedData();
  }

  const [saleDemandSuggestion, setSaleDemandSuggestion] = useState(null);
  const [leadTimeSuggestion, setLeadTimeSuggestion] = useState(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  useEffect(() => {
    if (predictedData.length === 0) return;
    setIsSuggestionLoading(true);
    const fetchSaleDemandSuggestion = async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suggestion/sales_demand`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          forecast_data: predictedData,
          sku_id: selectedProduct,
          store_id: selectedStore,
          category: selectedCategory,
          brand: selectedBrand,
        })
      })
        .then((res) => res.json())
        .then((data) => {
          setSaleDemandSuggestion(data.message);
        })
    }
    const fetchLeadTimeSuggestion = async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suggestion/lead_time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          forecast_data: predictedLeadTime,
          sku_id: selectedProduct,
          store_id: selectedStore,
          category: selectedCategory,
          brand: selectedBrand,
        })
      })
        .then((res) => res.json())
        .then((data) => {
          setLeadTimeSuggestion(data.message);
        })
      }
    setIsSuggestionLoading(false);
    fetchSaleDemandSuggestion();
    fetchLeadTimeSuggestion();
    const toastID = toast.loading("Generating suggestions...");
    toast.success("Suggestions generated!", { id: toastID });
  }, [predictedData])

  const demandChartData = [
    ...oldUnitSoldData.map(item => ({
      date: item.date,
      unit_sold: item.units_sold ?? 0,
      predicted_unit_sold: null,
    })),
    ...predictedData.map(item => ({
      date: item.date,
      unit_sold: null,
      predicted_unit_sold: item.predicted_unit_sold,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const leadTimeChartData = [...predictedLeadTime].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <>
      <div className="flex flex-col overflow-y-auto relative">
        <div className="w-full h-[20vh] overflow-hidden">
          <img src="/background.jpg" className="w-full h-full object-top rounded-md" />
        </div>
        <div className="absolute top-10 w-full">
          <div className="relative flex items-center text-white font-extrabold text-[55px] w-full">
            <div className="absolute left-1/2 -translate-x-1/2 text-nowrap mt-20">
              Demand Forecast
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="bg-white p-5 rounded-md shadow-md border border-gray-300 w-full mt-5 mb-10">
          <div className="flex items-center gap-5 text-[20px] mb-10">
            <Filter />
            <span>Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="w-full">
              <Label
                htmlFor="store-select"
                className="flex items-center gap-3 text-[16px] mb-2"
              >
                <Store size={14} />
                Store ID
              </Label>
              <Select
                value={selectedStore}
                onValueChange={setSelectedStore}
                className="mb-4"
                id="store-select"
                disabled={storeList.length === 0 || fetchingPrediction}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>

                <SelectContent>
                  {Array.isArray(storeList)
                    ? storeList.map((store) => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))
                    : null}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label
                htmlFor="category-select"
                className="flex items-center gap-3 text-[16px] mb-2"
              >
                <Grid2X2 size={14} />
                Category
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                className="mb-4"
                id="category-select"
                disabled={categoryList.length === 0 || fetchingPrediction}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>

                <SelectContent>
                  {Array.isArray(categoryList)
                    ? categoryList.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                    : null}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label
                htmlFor="brand-select"
                className="flex items-center gap-3 text-[16px] mb-2"
              >
                <ShoppingCart size={14} />
                Brand
              </Label>
              <Select
                value={selectedBrand}
                onValueChange={setSelectedBrand}
                className="mb-4"
                id="brand-select"
                disabled={brandList.length === 0 || fetchingPrediction}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>

                <SelectContent>
                  {Array.isArray(brandList)
                    ? brandList.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))
                    : null}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label
                htmlFor="product-select"
                className="flex items-center gap-3 text-[16px] mb-2"
              >
                <Package size={14} />
                Product
              </Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
                className="mb-4"
                id="product-select"
                disabled={productList.length === 0 || fetchingPrediction}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>

                <SelectContent>
                  {Array.isArray(productList)
                    ? productList.map((product, index) => (
                      <SelectItem key={index} value={product.sku_id}>
                        {product.sku_name}
                      </SelectItem>
                    ))
                    : null}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Button
                className="mt-7.5 w-full bg-[var(--main-color)] hover:bg-[var(--main-hover)] text-white"
                onClick={handleFilter}
                disabled={fetchingPrediction}
              >
                <Filter size={14} />
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
        <div className="mb-10" id="demand-forecast-results">
          <SubTitle text="Demand Forecast Results" />
          <SuggestionBox
            suggestion={saleDemandSuggestion}
            loading={isSuggestionLoading}
          />
          <div className="bg-white p-5 shadow-md border border-gray-300 w-full h-full rounded-md mt-5">
            <div className="text-center text-xl mb-3">
              Unit Sold of 12/2023 and 7 Days Prediction
            </div>
            <div className="text-center text-[12px] mb-3">
              <span className="font-bold">Store:</span> {selectedStore || "-"} - <span className="font-bold">Category:</span> {selectedCategory || "-"} - <span className="font-bold">Brand:</span> {selectedBrand || "-"} - <span className="font-bold">Product:</span> {selectedProduct || "-"}
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={demandChartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Lead Time (days)",
                    angle: -90,
                    position: "insideRight",
                  }}
                />

                <Tooltip />
                <Legend verticalAlign="bottom" align="center" />

                <Bar
                  dataKey="unit_sold"
                  name="Actual"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="predicted_unit_sold"
                  name="Predicted"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div id="lead-time-prediction-results">
          <SubTitle text="Lead Time Prediction Results" />
          <SuggestionBox
            suggestion={leadTimeSuggestion}
            loading={isSuggestionLoading}
          />
          <div className="bg-white p-5 shadow-md border rounded-md mt-5">
            <div className="text-center text-lg mb-3">
              Lead Time Prediction (Days)
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={leadTimeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="predicted_unit_sold"
                  name="Lead Time (days)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}
import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";
import { Cloud, Droplets, TrendingUp } from "lucide-react";

export const WeatherCorrelation = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  const [weatherData, setWeatherData] = useState([]);
  const [categoryWeatherData, setCategoryWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeatherData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      const weatherRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/weather-correlation?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      );
      const weatherJson = await weatherRes.json();
      setWeatherData(weatherJson.data || []);

      const categoryRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/weather-by-category?country=${selectedCountry}&year=${selectedYear}`
      );
      const categoryJson = await categoryRes.json();
      setCategoryWeatherData(categoryJson.data || []);
    } catch (error) {
      toast.error("Failed to fetch weather data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate correlations
  const calculateCorrelation = (data, var1, var2) => {
    if (data.length === 0) return 0;
    const n = data.length;
    const meanVar1 = data.reduce((sum, d) => sum + d[var1], 0) / n;
    const meanVar2 = data.reduce((sum, d) => sum + d[var2], 0) / n;

    const numerator = data.reduce(
      (sum, d) => sum + (d[var1] - meanVar1) * (d[var2] - meanVar2),
      0
    );
    const denominator =
      Math.sqrt(
        data.reduce((sum, d) => sum + Math.pow(d[var1] - meanVar1, 2), 0)
      ) *
      Math.sqrt(
        data.reduce((sum, d) => sum + Math.pow(d[var2] - meanVar2, 2), 0)
      );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const tempSalesCorrelation = calculateCorrelation(
    weatherData,
    "temperature",
    "sales"
  );
  const rainSalesCorrelation = calculateCorrelation(
    weatherData,
    "rain_mm",
    "sales"
  );
  const tempUnitsCorrelation = calculateCorrelation(
    weatherData,
    "temperature",
    "units_sold"
  );

  // Group data by temperature segments for category analysis
  const tempSegmentGroups = {};
  categoryWeatherData.forEach((item) => {
    if (!tempSegmentGroups[item.temperature_segment]) {
      tempSegmentGroups[item.temperature_segment] = [];
    }
    tempSegmentGroups[item.temperature_segment].push(item);
  });

  return (
    <div className="w-full space-y-6">
      {/* Correlation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Temperature-Sales Correlation
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {tempSalesCorrelation.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.abs(tempSalesCorrelation) > 0.5
                  ? "Strong correlation"
                  : Math.abs(tempSalesCorrelation) > 0.3
                  ? "Moderate correlation"
                  : "Weak correlation"}
              </p>
            </div>
            <Cloud className="text-blue-300" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Rainfall-Sales Correlation
              </p>
              <p className="text-2xl font-bold text-green-700">
                {rainSalesCorrelation.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {rainSalesCorrelation < -0.3
                  ? "Negative impact"
                  : "Minimal impact"}
              </p>
            </div>
            <Droplets className="text-green-300" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Temperature-Units Correlation
              </p>
              <p className="text-2xl font-bold text-orange-700">
                {tempUnitsCorrelation.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Volume sensitivity</p>
            </div>
            <TrendingUp className="text-orange-300" size={40} />
          </div>
        </div>
      </div>

      {/* Daily Weather-Sales Trend */}
      {weatherData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Temperature & Sales Daily Trend
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={weatherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Sales ($)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Temperature (°C)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="sales"
                fill="#3b82f6"
                name="Sales ($)"
                opacity={0.7}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                name="Temperature (°C)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rainfall Impact */}
      {weatherData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Daily Rainfall Pattern
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weatherData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value} mm`} />
                <Bar
                  dataKey="rain_mm"
                  fill="#06b6d4"
                  name="Rainfall"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Temperature Distribution
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weatherData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}°C`} />
                <Bar
                  dataKey="temperature"
                  fill="#fbbf24"
                  name="Temperature"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weather Impact by Category */}
      {categoryWeatherData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Weather Impact by Product Category
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cold weather products */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-3">
                ❄️ Cold Conditions (&lt;10°C)
              </h4>
              <div className="space-y-2">
                {categoryWeatherData
                  .filter((d) => d.temperature_segment === "Cold (<10°C)")
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.category}
                      className="bg-white p-2 rounded border border-blue-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">
                          {item.category}
                        </span>
                        <span className="text-sm text-blue-700 font-semibold">
                          ${item.sales.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Units: {item.units.toLocaleString()} | Avg per txn: $
                        {item.avg_sales_per_transaction.toFixed(2)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Warm/Hot weather products */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold text-red-900 mb-3">
                🌞 Warm/Hot Conditions (&gt;20°C)
              </h4>
              <div className="space-y-2">
                {categoryWeatherData
                  .filter(
                    (d) =>
                      d.temperature_segment.includes(">") ||
                      d.temperature_segment.includes("30")
                  )
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.category}
                      className="bg-white p-2 rounded border border-red-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">
                          {item.category}
                        </span>
                        <span className="text-sm text-red-700 font-semibold">
                          ${item.sales.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Units: {item.units.toLocaleString()} | Avg per txn: $
                        {item.avg_sales_per_transaction.toFixed(2)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3">
          🌡️ Weather Impact Insights
        </h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            • Temperature shows{" "}
            <span className="font-semibold">
              {Math.abs(tempSalesCorrelation) > 0.5
                ? "strong"
                : Math.abs(tempSalesCorrelation) > 0.3
                ? "moderate"
                : "weak"}
            </span>{" "}
            correlation with sales ({tempSalesCorrelation.toFixed(3)})
          </li>
          <li>
            • Rainfall has a{" "}
            <span className="font-semibold">
              {rainSalesCorrelation < -0.3
                ? "negative"
                : rainSalesCorrelation > 0.3
                ? "positive"
                : "minimal"}
            </span>{" "}
            impact on sales
          </li>
          <li>
            • Consider seasonal adjustments for demand forecasting and inventory
            planning based on weather patterns
          </li>
          <li>
            • Different product categories show varying sensitivity to
            temperature changes - optimize promotions accordingly
          </li>
        </ul>
      </div>
    </div>
  );
};

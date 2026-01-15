import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export const InventoryOptimization = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);

  const [inventoryData, setInventoryData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchInventoryData();
  }, [selectedCountry, selectedYear]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/inventory-optimization?country=${selectedCountry}&year=${selectedYear}`
      );
      const json = await res.json();
      setInventoryData(json.data || []);
      setSummary(json.summary || null);
    } catch (error) {
      toast.error("Failed to fetch inventory data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData =
    filter === "high"
      ? inventoryData.filter((i) => i.priority === "High")
      : filter === "medium"
      ? inventoryData.filter((i) => i.priority === "Medium")
      : filter === "optimal"
      ? inventoryData.filter((i) => i.priority === "Low")
      : inventoryData;

  const getStatusColor = (priority) => {
    switch (priority) {
      case "High":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          badge: "bg-red-100 text-red-700",
        };
      case "Medium":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          badge: "bg-yellow-100 text-yellow-700",
        };
      case "Low":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          badge: "bg-green-100 text-green-700",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          badge: "bg-gray-100 text-gray-700",
        };
    }
  };

  const getStatusIcon = (priority) => {
    switch (priority) {
      case "High":
        return <AlertCircle className="text-red-600" size={20} />;
      case "Medium":
        return <Clock className="text-yellow-600" size={20} />;
      case "Low":
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Now</p>
                <p className="text-2xl font-bold text-red-700">
                  {summary.high_priority_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Items below reorder point
                </p>
              </div>
              <AlertCircle className="text-red-300" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Plan Replenishment</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {summary.medium_priority_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Medium priority items
                </p>
              </div>
              <Clock className="text-yellow-300" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Optimal Stock</p>
                <p className="text-2xl font-bold text-green-700">
                  {summary.optimal_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">Well-stocked items</p>
              </div>
              <CheckCircle className="text-green-300" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-lg border border-gray-200">
        {[
          { label: "All Items", value: "all" },
          { label: "High Priority", value: "high" },
          { label: "Medium Priority", value: "medium" },
          { label: "Optimal Stock", value: "optimal" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === tab.value
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inventory Detail Table */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Inventory Status & Recommendations
        </h3>

        {filteredData.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredData.map((item, idx) => {
              const colors = getStatusColor(item.priority);
              const icon = getStatusIcon(item.priority);

              return (
                <div
                  key={`${item.sku_id}-${item.store_id}`}
                  className={`${colors.bg} ${colors.border} border rounded-lg p-4 hover:shadow-md transition`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {icon}
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800">
                          {item.sku_name}
                        </h5>
                        <p className="text-xs text-gray-600">
                          SKU: {item.sku_id} | Store: {item.store_id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`${colors.badge} px-3 py-1 rounded-full text-xs font-semibold`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-white bg-opacity-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Current Stock</div>
                      <div className="text-lg font-bold text-gray-800">
                        {item.current_stock}
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Safety Stock</div>
                      <div className="text-lg font-bold text-gray-800">
                        {item.safety_stock}
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Reorder Point</div>
                      <div className="text-lg font-bold text-gray-800">
                        {item.reorder_point}
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Days of Stock</div>
                      <div className="text-lg font-bold text-gray-800">
                        {item.days_of_stock}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-3">
                    <div>
                      <span className="text-gray-600">Avg Daily Sales:</span>
                      <span className="font-semibold text-gray-800 ml-1">
                        {item.avg_daily_sales} units
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Lead Time:</span>
                      <span className="font-semibold text-gray-800 ml-1">
                        {item.lead_time_days} days
                      </span>
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-70 rounded p-2 border border-gray-300">
                    <p className="text-sm font-semibold text-gray-800">
                      📋 Recommendation:{" "}
                      <span className="text-blue-600">
                        {item.recommendation}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No inventory items found for selected filters
          </div>
        )}
      </div>

      {/* Stock Level Distribution */}
      {inventoryData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Stock Level Analysis
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold mb-4 text-gray-700">
                Current vs Reorder Point Distribution
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="reorder_point"
                    name="Reorder Point"
                    type="number"
                  />
                  <YAxis
                    dataKey="current_stock"
                    name="Current Stock"
                    type="number"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value) => value.toFixed(0)}
                  />
                  <Scatter
                    name="Items"
                    data={inventoryData.slice(0, 100)}
                    fill="#8884d8"
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-md font-semibold mb-4 text-gray-700">
                Days of Stock Distribution
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inventoryData.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sku_id"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)} days`} />
                  <Bar dataKey="days_of_stock" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {inventoryData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-3">
            📊 Optimization Insights
          </h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              •{" "}
              <span className="font-semibold">
                {summary.high_priority_count} items
              </span>{" "}
              require immediate ordering to prevent stockouts
            </li>
            <li>
              • Average days of stock:{" "}
              <span className="font-semibold">
                {(
                  inventoryData.reduce((sum, i) => sum + i.days_of_stock, 0) /
                  inventoryData.length
                ).toFixed(1)}
              </span>{" "}
              days
            </li>
            <li>
              • Items with more than 30 days of stock:{" "}
              <span className="font-semibold">
                {inventoryData.filter((i) => i.days_of_stock > 30).length}
              </span>{" "}
              (potential overstocking)
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

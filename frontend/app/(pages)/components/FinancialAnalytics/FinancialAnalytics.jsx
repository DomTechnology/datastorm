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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Filter } from "lucide-react";
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";
import { useGlobalLoading } from "../../../context/loadingContext";

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export const FinancialAnalytics = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const startDate = useFilterStore((state) => state.startDate);
  const endDate = useFilterStore((state) => state.endDate);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);
  const setStartDate = useFilterStore((state) => state.setStartDate);
  const setEndDate = useFilterStore((state) => state.setEndDate);

  const { startLoading, stopLoading, isLoading } = useGlobalLoading();
  const [loading, setLoading] = useState(false);

  const [revenueData, setRevenueData] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [kpiData, setKpiData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCountry, selectedYear, startDate, endDate, selectedMonth]);

  const fetchAnalytics = async () => {
    try {
      setProfitData([]);
      setRevenueData([]);
      setKpiData(null);
      startLoading();
      setLoading(true);
      // Fetch revenue data
      const revenueRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/revenue?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      );
      const revenueJson = await revenueRes.json();
      setRevenueData(revenueJson.data || []);

      // Fetch profit data
      const profitRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/profit?country=${selectedCountry}&year=${selectedYear}`
      );
      const profitJson = await profitRes.json();
      setProfitData(profitJson.data || []);

      // Fetch KPI data
      const kpiRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/kpi?country=${selectedCountry}`
      );
      const kpiJson = await kpiRes.json();
      setKpiData(kpiJson.data || null);
    } catch (error) {
      toast.error("Failed to fetch financial analytics");
      console.error(error);
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Total Sales</p>
            <p className="text-2xl font-bold text-blue-700">
              $
              {(kpiData.total_sales || 0).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Promo Contribution</p>
            <p className="text-2xl font-bold text-green-700">
              {(kpiData.promo_contribution_pct || 0).toFixed(1)}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Stockout Rate</p>
            <p className="text-2xl font-bold text-red-700">
              {(kpiData.stockout_rate_pct || 0).toFixed(2)}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Transactions</p>
            <p className="text-2xl font-bold text-purple-700">
              {(kpiData.total_transactions || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Profit by Category */}
      {/* {profitData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-bold mb-4">Profit by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-bold mb-4">Margin % by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  label={{
                    value: "Margin %",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Bar dataKey="margin_pct" fill="#f59e0b" name="Margin %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )} */}

      {/* Profit Details Table */}
      {profitData.length > 0 && (
        <div className="">
          <h3 className="text-lg font-bold mb-4">Profit Details by Category</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Revenue</th>
                <th className="px-4 py-2 text-right">Cost</th>
                <th className="px-4 py-2 text-right">Profit</th>
                <th className="px-4 py-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {profitData.map((row, idx) => (
                <tr
                  key={row.category}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 font-medium">{row.category}</td>
                  <td className="px-4 py-2 text-right">
                    ${row.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${row.cost.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-green-600">
                    ${row.profit.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {row.margin_pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading financial analytics...</p>
        </div>
      )}
    </div>
  );
};

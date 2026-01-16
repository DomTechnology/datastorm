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
} from "recharts";
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";
import { Package, TrendingDown, Clock, DollarSign } from "lucide-react";

export const SupplierPerformance = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);

  const [supplierData, setSupplierData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSupplierData();
  }, [selectedCountry, selectedYear]);

  const fetchSupplierData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/supplier?country=${selectedCountry}&year=${selectedYear}`
      );
      const json = await res.json();
      setSupplierData(
        (json.data || []).sort((a, b) => b.total_sales - a.total_sales)
      );
    } catch (error) {
      toast.error("Failed to fetch supplier analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Summary metrics
  const totalSuppliers = supplierData.length;
  const totalCost = supplierData.reduce((sum, s) => sum + s.total_cost, 0);
  const totalProfit = supplierData.reduce((sum, s) => sum + s.profit, 0);
  const avgLeadTime =
    supplierData.length > 0
      ? (
          supplierData.reduce((sum, s) => sum + s.avg_lead_time_days, 0) /
          totalSuppliers
        ).toFixed(1)
      : 0;

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Suppliers</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalSuppliers}
              </p>
            </div>
            <Package className="text-blue-300" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Profit</p>
              <p className="text-2xl font-bold text-green-700">
                ${(totalProfit / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="text-green-300" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Lead Time</p>
              <p className="text-2xl font-bold text-orange-700">
                {avgLeadTime} days
              </p>
            </div>
            <Clock className="text-orange-300" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-red-700">
                ${(totalCost / 1000000).toFixed(1)}M
              </p>
            </div>
            <TrendingDown className="text-red-300" size={32} />
          </div>
        </div>
      </div>

      {/* Supplier Detailed Table */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Supplier Performance Dashboard
        </h3>

        {supplierData.length > 0 ? (
          <div className="overflow-x-auto max-h-100 overflow-y-scroll">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Supplier ID
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Products
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Units
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Total Sales
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Lead Time
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Cost/Unit
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {supplierData.map((supplier, idx) => {
                  const profitMargin = (
                    (supplier.profit / supplier.total_sales) *
                    100
                  ).toFixed(1);
                  const profitColor =
                    profitMargin > 25
                      ? "green"
                      : profitMargin > 15
                      ? "yellow"
                      : "red";

                  return (
                    <tr
                      key={supplier.supplier_id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {supplier.supplier_id}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {supplier.products_supplied}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {supplier.total_units.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${supplier.total_cost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        ${supplier.total_sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            supplier.profit > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          ${supplier.profit.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {supplier.avg_lead_time_days.toFixed(1)} days
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${supplier.cost_per_unit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            profitColor === "green"
                              ? "bg-green-100 text-green-700"
                              : profitColor === "yellow"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {profitMargin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No supplier data available
          </div>
        )}
      </div>

      {/* Comparison Charts */}
      {supplierData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Supplier Profit Ranking
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supplierData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="supplier_id"
                  type="category"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="profit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Lead Time by Supplier
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supplierData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="supplier_id"
                  type="category"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => `${value.toFixed(1)} days`} />
                <Bar dataKey="avg_lead_time_days" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cost Analysis */}
      {supplierData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Cost Efficiency Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={supplierData.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="supplier_id"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="cost_per_unit" fill="#ef4444" name="Cost/Unit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

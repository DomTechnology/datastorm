import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

const GRADIENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const PriceDiscountAnalytics = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);

  const [pricingData, setPricingData] = useState([]);
  const [discountImpactData, setDiscountImpactData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, [selectedCountry, selectedYear]);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const pricingRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/pricing?country=${selectedCountry}&year=${selectedYear}`
      );
      const pricingJson = await pricingRes.json();
      setPricingData(pricingJson.data || []);

      const discountRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/discount-impact?country=${selectedCountry}&year=${selectedYear}`
      );
      const discountJson = await discountRes.json();
      setDiscountImpactData(discountJson.data || []);
    } catch (error) {
      toast.error("Failed to fetch pricing analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Pricing Overview by Category */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Pricing & Margin Analysis by Category
        </h3>

        {pricingData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    List Price
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Avg Discount
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Price Realization
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Margin %
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Total Sales
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Units
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingData.map((item, idx) => (
                  <tr
                    key={item.category}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${item.avg_list_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                        -{item.avg_discount_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                        {(item.price_realization * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {item.avg_margin_pct}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${item.total_sales.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.total_units.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Price vs Margin Chart */}
      {pricingData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              List Price by Category
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pricingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Bar
                  dataKey="avg_list_price"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Margin % by Category
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pricingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar
                  dataKey="avg_margin_pct"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Discount Impact Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          <TrendingUp className="inline mr-2" size={20} />
          Discount Effectiveness Analysis
        </h3>

        {discountImpactData.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {discountImpactData.map((item) => (
                <div
                  key={item.category}
                  className="border border-gray-300 rounded-lg p-4"
                >
                  <h5 className="font-semibold text-gray-800 mb-3">
                    {item.category}
                  </h5>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Units with Discount:
                      </span>
                      <span className="font-semibold">
                        {item.units_with_discount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Units without Discount:
                      </span>
                      <span className="font-semibold">
                        {item.units_without_discount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg mb-3">
                    <div className="text-xs text-gray-600 mb-1">
                      Discount Lift
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {item.units_lift_pct > 0 ? "+" : ""}
                      {item.units_lift_pct.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Incremental units from discounts
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-gray-600">
                    <div>
                      Sales with discount: $
                      {item.sales_with_discount.toLocaleString()}
                    </div>
                    <div>
                      Sales without discount: $
                      {item.sales_without_discount.toLocaleString()}
                    </div>
                    <div className="pt-2 border-t">
                      Transactions: {item.transaction_count_discounted} vs{" "}
                      {item.transaction_count_no_discount}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h5 className="font-semibold text-blue-900 mb-2">Key Insights</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Average discount lift across categories:{" "}
                  <span className="font-semibold">
                    {(
                      discountImpactData.reduce(
                        (sum, item) => sum + item.units_lift_pct,
                        0
                      ) / discountImpactData.length
                    ).toFixed(1)}
                    %
                  </span>
                </li>
                <li>
                  • Highest performing category:{" "}
                  <span className="font-semibold">
                    {
                      discountImpactData.reduce((max, item) =>
                        item.units_lift_pct > max.units_lift_pct ? item : max
                      ).category
                    }
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

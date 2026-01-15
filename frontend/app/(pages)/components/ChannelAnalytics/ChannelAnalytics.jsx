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
import { useFilterStore } from "@/app/store/useFilterStore";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

export const ChannelAnalytics = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  const [channelData, setChannelData] = useState([]);
  const [dailyChannelData, setDailyChannelData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChannelData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const fetchChannelData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/channel?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      );
      const json = await res.json();
      setChannelData(json.data || []);

      const dailyRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/channel/daily?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      );
      const dailyJson = await dailyRes.json();
      setDailyChannelData(dailyJson.data || []);
    } catch (error) {
      toast.error("Failed to fetch channel analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Transform daily data for multi-line chart
  const dailyChartData = {};
  dailyChannelData.forEach((item) => {
    const dateKey = item.date;
    if (!dailyChartData[dateKey]) {
      dailyChartData[dateKey] = { date: dateKey };
    }
    dailyChartData[dateKey][item.channel] = item.sales;
  });
  const transformedDailyData = Object.values(dailyChartData);

  return (
    <div className="w-full space-y-6">
      {/* Channel Performance Overview */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Channel Performance Overview
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Channel Pie */}
          <div className="flex flex-col items-center">
            <h4 className="text-sm font-medium text-gray-600 mb-4">
              Sales Distribution
            </h4>
            {channelData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="sales"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ channel, sales_pct }) =>
                      `${channel}: ${sales_pct}%`
                    }
                  >
                    {channelData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `$${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Channel KPI Cards */}
          <div className="space-y-3">
            {channelData.map((channel, idx) => (
              <div
                key={channel.channel}
                className="bg-gradient-to-r p-4 rounded-lg border border-gray-200"
                style={{
                  backgroundImage: `linear-gradient(to right, ${
                    COLORS[idx % COLORS.length]
                  }15, ${COLORS[idx % COLORS.length]}05)`,
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-semibold text-gray-700">
                    {channel.channel}
                  </h5>
                  <span
                    className="text-sm font-bold px-2 py-1 rounded"
                    style={{
                      backgroundColor: COLORS[idx % COLORS.length],
                      color: "white",
                    }}
                  >
                    {channel.sales_pct}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    Sales:{" "}
                    <span className="font-semibold text-gray-800">
                      ${channel.sales.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Units:{" "}
                    <span className="font-semibold text-gray-800">
                      {channel.units.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Stores:{" "}
                    <span className="font-semibold text-gray-800">
                      {channel.stores}
                    </span>
                  </div>
                  <div>
                    Products:{" "}
                    <span className="font-semibold text-gray-800">
                      {channel.products}
                    </span>
                  </div>
                  <div>
                    Avg Discount:{" "}
                    <span className="font-semibold text-gray-800">
                      {channel.avg_discount_pct}%
                    </span>
                  </div>
                  <div>
                    Stockouts:{" "}
                    <span className="font-semibold text-gray-800">
                      {channel.stockout_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Channel Trend */}
      {transformedDailyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Daily Sales Trend by Channel
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transformedDailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              {channelData.map((channel, idx) => (
                <Line
                  key={channel.channel}
                  type="monotone"
                  dataKey={channel.channel}
                  stroke={COLORS[idx % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Channel Comparison Bar Chart */}
      {channelData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Units Sold by Channel
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="units" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">
              Average Discount by Channel
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar
                  dataKey="avg_discount_pct"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

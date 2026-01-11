"use client";

import { useFilterStore } from "@/app/store/useFilterStore";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const HorizontalSKUDBarChart = () => {
  const [data, setData] = useState([]);
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  useEffect(() => {
    const fetchData = async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sku/top?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}&limit=10`
      )
        .then((response) => response.json())
        .then((data) => {
          setData(data.data);
        });
    };
    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const chartHeight = data.length * 35;

  return (
    <>
      <div className="bg-white p-5 rounded-md// shadow-md border border-gray-300 w-full h-full rounded-md">
        <div className="text-center text-xl mb-10">
          Top 10 SKU - {selectedMonth !== "all" ? selectedMonth : "All Months"}/
          {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
          {selectedCountry !== "all" ? selectedCountry : "All Countries"}
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 50, left: -20, bottom: 10 }}
          >
            <XAxis type="number" />
            <YAxis
              dataKey="sku_name"
              type="category"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar
              dataKey="units_sold"
              fill="#3b82f6"
              radius={[0, 6, 6, 0]}
              label={{ position: "right", fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

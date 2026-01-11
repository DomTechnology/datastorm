"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useFilterStore } from "../../../store/useFilterStore";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export const NetSalesCategory = () => {
  const [data, setData] = useState([]);

  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  useEffect(() => {
    const fetchData = async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/net_sales/category?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      )
        .then((response) => response.json())
        .then((data) => {
          setData(data.data);
        });
    };
    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#A28EFF",
    "#FF6699",
  ];

  const renderLabel = (entry) => {
    const total = data.reduce((sum, item) => sum + item.net_sales, 0);
    const percent = ((entry.net_sales / total) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <>
      <div className="bg-white p-5 rounded-md// shadow-md border border-gray-300 w-full h-full flex flex-col justify-center rounded-md items-center">
        <div className="text-center text-xl mb-10">
          Net Sales Category -{" "}
          {selectedMonth !== "all" ? selectedMonth : "All Months"}/
          {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
          {selectedCountry !== "all" ? selectedCountry : "All Countries"}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="net_sales"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={renderLabel}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

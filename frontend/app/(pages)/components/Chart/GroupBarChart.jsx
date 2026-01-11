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

export const GroupBarChart = () => {
  const [data, setData] = useState({});
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  useEffect(() => {
    const fetchData = async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unit_sold/holiday_weekday?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      )
        .then((response) => response.json())
        .then((data) => {
          setData(data);
        });
    };
    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const chartData = [
    {
      group: "Weekday vs Weekend",
      Weekday: data.weekday?.total_units_sold || 0,
      Weekend: data.weekend?.total_units_sold || 0,
    },
    {
      group: "Holiday vs Non-holiday",
      Holiday: data.holiday?.total_units_sold || 0,
      "Non-holiday": data.non_holiday?.total_units_sold || 0,
    },
  ];

  return (
    <>
      <div className="bg-white p-5 rounded-md// shadow-md border border-gray-300 w-full h-full rounded-md">
        <div className="text-center text-xl">
          Unit sold between Holiday/Non-holiday and Weekday/Weekend
        </div>
        <div className="text-center text-xl">
          {selectedMonth !== "all" ? selectedMonth : "All Months"}/
          {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
          {selectedCountry !== "all" ? selectedCountry : "All Countries"}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
            barCategoryGap="20%"   // Khoảng cách giữa các nhóm, giảm % để nhóm gần nhau hơn
            barGap={2}             // Khoảng cách giữa các thanh trong cùng 1 nhóm
          >
            <XAxis dataKey="group" tick={{ fontSize: 12 }} />
            <YAxis
              label={{
                value: "Units sold",
                position: "insideLeft",
                angle: 90,
                offset: 70,
              }}
            />
            <Tooltip />
            <Legend verticalAlign="bottom" />
            <Bar dataKey="Weekday" fill="#3b82f6" />
            <Bar dataKey="Weekend" fill="#22c55e" />
            <Bar dataKey="Holiday" fill="#f97316" />
            <Bar dataKey="Non-holiday" fill="#e11d48" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

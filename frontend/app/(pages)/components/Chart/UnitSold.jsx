"use client";

import { useEffect, useState } from "react";
import { useFilterStore } from "../../../store/useFilterStore";
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
} from "recharts";

export const UnitSold = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const setSelectedYear = useFilterStore((state) => state.setSelectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);
  const setYearList = useFilterStore((state) => state.setYearList);

  const [unitSoldData, setUnitSoldData] = useState([]);

  const startDate = useFilterStore((state) => state.startDate);
  const endDate = useFilterStore((state) => state.endDate);
  const setStartDate = useFilterStore((state) => state.setStartDate);
  const setEndDate = useFilterStore((state) => state.setEndDate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let yearQuery = selectedYear || "";

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/unit_sold/daily?country=${selectedCountry}&year=${yearQuery}&month=${selectedMonth}`
        );

        const data = await res.json();

        setUnitSoldData(data.data);
        setStartDate(data.meta.startDate);
        setEndDate(data.meta.endDate);
        setYearList(data.meta.yearList);

        if (!selectedYear && data.meta.yearList?.length > 0) {
          setSelectedYear(data.meta.yearList[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const years =
    startDate && endDate
      ? Array.from(
          {
            length:
              new Date(endDate).getFullYear() -
              new Date(startDate).getFullYear() +
              1,
          },
          (_, i) => new Date(startDate).getFullYear() + i
        )
      : [];

  const yearColors = ["#3b82f6", "#22c55e", "#f97316"];

  const mergedData = unitSoldData.map((item) => ({
    date: item.date,
    unit_sold: item.units_sold || 0,
  }));

  return (
    <div className="bg-white p-5 shadow-md border border-gray-300 w-full h-full rounded-md">
      <div className="text-center text-xl mb-3">
        Unit Sold - {selectedMonth !== "all" ? selectedMonth : "All Months"} /
        {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
        {selectedCountry !== "all" ? selectedCountry : "All Countries"}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={mergedData} barCategoryGap="2">
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={20} />
          <YAxis tick={{ fontSize: 12 }} />

          <Tooltip />

          {years.map((year, index) => (
            <ReferenceArea
              key={year}
              x1={`${year}-01-01`}
              x2={`${year}-12-31`}
              fill={yearColors[index % yearColors.length]}
              fillOpacity={0.1}
              label={{ value: year, position: "insideTop" }}
            />
          ))}

          <Bar
            dataKey="unit_sold"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            barSize={14}
          />

          <Legend verticalAlign="bottom" align="center" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
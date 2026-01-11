"use client";

import { useEffect, useState } from "react";
import { useFilterStore } from "../../../store/useFilterStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from "recharts";
import { toast } from "sonner";

export const NetSales = () => {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);

  const selectedYear = useFilterStore((state) => state.selectedYear);
  const setSelectedYear = useFilterStore((state) => state.setSelectedYear);

  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  const setYearList = useFilterStore((state) => state.setYearList);

  const [netSalesData, setNetSalesData] = useState([]);
  const startDate = useFilterStore((state) => state.startDate);
  const endDate = useFilterStore((state) => state.endDate);
  const setStartDate = useFilterStore((state) => state.setStartDate);
  const setEndDate = useFilterStore((state) => state.setEndDate);
  useEffect(() => {
    const fetchData = async () => {
      const toastId = toast.loading("Fetching data...");
      try {
        let yearQuery = selectedYear || "";
        const [netRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/net_sales/daily?country=${selectedCountry}&year=${yearQuery}&month=${selectedMonth}`
          )
        ]);

        const netData = await netRes.json();

        setNetSalesData(netData.data);
        setStartDate(netData.meta.startDate);
        setEndDate(netData.meta.endDate);
        setYearList(netData.meta.yearList);

        if (!selectedYear && netData.meta.yearList?.length > 0) {
          setSelectedYear(netData.meta.yearList[0]);
        }

        toast.success("Data fetched successfully!", { id: toastId });
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch data!", { id: toastId });
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
  const mergedData = netSalesData.map((item, index) => ({
    ...item
  }));

  return (
    <>
      <div className="bg-white p-5 rounded-md// shadow-md border border-gray-300 w-full h-full rounded-md">
        <div className="text-center text-xl">
          Net Sales - {selectedMonth !== "all" ? selectedMonth : "All Months"}/
          {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
          {selectedCountry !== "all" ? selectedCountry : "All Countries"}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mergedData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />

            <YAxis tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
            />

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

            <Line
              type="monotone"
              dataKey="net_sales"
              strokeWidth={2}
              dot={false}
              
            />
            <Legend verticalAlign="bottom" align="center" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

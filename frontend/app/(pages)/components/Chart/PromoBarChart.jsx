"use client";

import { useEffect, useState } from "react";
import { useFilterStore } from "../../../store/useFilterStore";
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

export const PromoBarChart = () => {
  const [data, setData] = useState([]);

  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const selectedYear = useFilterStore((state) => state.selectedYear);
  const selectedMonth = useFilterStore((state) => state.selectedMonth);

  useEffect(() => {
    const fetchData = async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unit_sold/promo?country=${selectedCountry}&year=${selectedYear}&month=${selectedMonth}`
      )
        .then((response) => response.json())
        .then((data) => {
          setData(data.data);
        });
    };
    fetchData();
  }, [selectedCountry, selectedYear, selectedMonth]);

  const promo = data.find((d) => d.promo_flag === true);
  const nonPromo = data.find((d) => d.promo_flag === false);

  const chartData = [
    {
      group: "Promo vs Non-promo",
      Promo: promo?.net_sales || 0,
      "Non-promo": nonPromo?.net_sales || 0,
    },
  ];

  return (
    <>
      <div className="bg-white p-5 rounded-md// shadow-md border border-gray-300 w-full h-full rounded-md">
        <div className="text-center text-xl mb-10">
          Promotion Flag on Net Sales -{" "}
          {selectedMonth !== "all" ? selectedMonth : "All Months"}/
          {selectedYear !== "all" ? selectedYear : "All Years"} -{" "}
          {selectedCountry !== "all" ? selectedCountry : "All Countries"}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="group" />
            <YAxis
              label={{
                value: "Net Sales",
                position: "insideLeft",
                angle: 90,
                offset: 70,
              }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="Promo" fill="#22c55e" />
            <Bar dataKey="Non-promo" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

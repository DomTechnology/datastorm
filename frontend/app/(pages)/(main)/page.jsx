"use client";

import { UnitSold } from "../components/Chart/UnitSold";
import { NetSales } from "../components/Chart/NetSales";
import { NetSalesCategory } from "../components/Chart/NetSalesCategory";
import { GroupBarChart } from "../components/Chart/GroupBarChart";
import { HorizontalSKUDBarChart } from "../components/Chart/HorizontalSKUDBarChart";
import { PromoBarChart } from "../components/Chart/PromoBarChart";
import { MainMap } from "../components/Map/MainMap";
import { MapLegend } from "../components/Map/MapLegend";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Filter, Flag } from "lucide-react";
import { useFilterStore } from "@/app/store/useFilterStore";
import { useEffect, useState } from "react";
import { SubTitle } from "../components/SubTitle";

export default function MapPage() {
  const selectedCountry = useFilterStore((state) => state.selectedCountry);
  const setSelectedCountry = useFilterStore(
    (state) => state.setSelectedCountry
  );

  const selectedYear = useFilterStore((state) => state.selectedYear);
  const setSelectedYear = useFilterStore((state) => state.setSelectedYear);

  const selectedMonth = useFilterStore((state) => state.selectedMonth);
  const setSelectedMonth = useFilterStore((state) => state.setSelectedMonth);

  const countries = useFilterStore((state) => state.countries);
  const setCountries = useFilterStore((state) => state.setCountries);

  const yearList = useFilterStore((state) => state.yearList);

  const [information, setInformation] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/country`)
        .then((res) => res.json())
        .then((data) => {
          setCountries(data.countries);
        });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/information`)
        .then((res) => res.json())
        .then((data) => {
          setInformation(data);
        });
    }
    fetchData();
  }, []);

  const monthList = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  const startDate = useFilterStore((state) => state.startDate);
  const endDate = useFilterStore((state) => state.endDate);

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
      : yearList;

  return (
    <>
      <div className="flex flex-col overflow-y-auto relative">
        <div className="w-full h-[40vh] overflow-hidden">
          <img src="/background.jpg" className="w-full h-full object-top rounded-md" />
        </div>
        <div className="absolute top-10 w-full">
          <div className="relative flex items-center text-white font-extrabold text-[55px] w-full">
            <div className="absolute left-1/2 -translate-x-1/2 text-nowrap mt-20">
              Sale Management Dashboard
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto relative">
        <div className="-mt-50 z-10 absolute flex justify-center text-white w-full">
          <div className="bg-[#ffffff3f] py-3 px-10 rounded-md border border-white shadow-md flex items-center justify-center gap-10">
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              {/* <Warehouse size={50} /> */}
              <div>
                <div className="text-[20px] font-bold">Countries</div>
                <div className="text-[30px] font-bold">{information ? information.number_of_countries : "..."}</div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              {/* <DollarSign size={50} /> */}
              <div>
                <div className="text-[20px] font-bold">Total Net Sales</div>
                <div className="text-[30px] font-bold">{information ? parseFloat(information.total_net_sales.toFixed(2)).toLocaleString() + " $" : "..."}</div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              {/* <DollarSign size={50} /> */}
              <div>
                <div className="text-[20px] font-bold">Stores</div>
                <div className="text-[30px] font-bold">{information ? information.total_stores : "..."}</div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              {/* <Percent size={50} /> */}
              <div>
                <div className="text-[20px] font-bold">Products</div>
                <div className="text-[30px] font-bold">{information ? information.total_products : "..."}</div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {/* <Warehouse size={50} /> */}
              <div>
                <div className="text-[20px] font-bold">Days</div>
                <div className="text-[30px] font-bold">{information ? information.number_of_days : "..."}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10" id="stock-out-rate-to-location">
          <SubTitle text="Stock out Rate to Location" />
          <div className="w-full relative h-125 rounded-md overflow-hidden">
            <MainMap />
            <MapLegend />
          </div>
        </div>
        <div className="mt-10" id="sales-analysis">
          <SubTitle text="Sales Analysis" />
          <div className="w-full mb-5">
            <div className="text-left text-xl">
              Net sales and Stock out Rate of{" "}
              {selectedCountry === "all" ? "All Countries" : selectedCountry} -{" "}
              {selectedMonth === "all" ? "All Months" : selectedMonth}/
              {selectedYear === "all" ? "All Years" : selectedYear}
            </div>
          </div>
          <div className="bg-white p-5 rounded-md shadow-md border border-gray-300 w-full">
            <div className="flex items-center gap-5 text-[20px] mb-5">
              <Filter />
              <span>Filter</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="w-full">
                <Label
                  htmlFor="country-select"
                  className="flex items-center gap-3 text-[16px] mb-2"
                >
                  <Flag size={14} />
                  Country
                </Label>
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                  className="mb-4"
                  id="country-select"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem key="all" value="all">
                      All countries
                    </SelectItem>
                    {Array.isArray(countries)
                      ? countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full mb-10">
                <Label
                  htmlFor="year-select"
                  className="flex items-center gap-3 text-[16px] mb-2"
                >
                  <Calendar size={14} />
                  Year
                </Label>
                <Select
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                  disabled={!years.length}
                  className="mb-4"
                  id="year-select"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>

                  <SelectContent>
                    {Array.isArray(yearList)
                      ? yearList.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full mb-10">
                <Label
                  htmlFor="month-select"
                  className="flex items-center gap-3 text-[16px] mb-2"
                >
                  <Calendar size={14} /> Month
                </Label>
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                  className="mb-4"
                  id="month-select"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>

                  <SelectContent>
                    {Array.isArray(monthList)
                      ? monthList.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 mt-5 gap-5">
            {/* Row 1 */}
            <div className="col-span-2">
              <NetSales />
            </div>
            <div className="col-span-1 row-span-2">
              <NetSalesCategory />
            </div>

            {/* Row 2 */}
            <div className="col-span-2">
              <UnitSold />
            </div>
            <div className="col-span-1" />
          </div>

          <div className="mt-5 gap-4">
            <HorizontalSKUDBarChart />
          </div>

          <div className="grid grid-cols-3 mt-5 gap-5 items-stretch">
            <div className="col-span-2 h-full">
              <GroupBarChart />
            </div>

            <div className="col-span-1 h-full">
              <PromoBarChart />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  const [topProducts, setTopProducts] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/country`)
      //   .then((res) => res.json())
      //   .then((data) => {
      //     setCountries(data.countries);
      //   });
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/information`)
      //   .then((res) => res.json())
      //   .then((data) => {
      //     setInformation(data);
      //   });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sku/top?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          setTopProducts(data.data);
          console.log(data.data);
        });
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/product/stock_alerts`)
      //   .then((res) => res.json())
      //   .then((data) => {
      //     setStockAlerts(data.data);
      //   });
    };
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
          <img
            src="/background.jpg"
            className="w-full h-full object-top rounded-md"
          />
        </div>
      </div>
      <div className="container mx-auto relative">
        <div className="-mt-65 z-10 absolute flex justify-center text-white w-full">
          <div className="bg-[#ffffff3f] py-3 px-10 rounded-md border border-white shadow-md flex items-center justify-center gap-10">
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              <div>
                <div className="text-[20px] font-bold">Total Net Sales</div>
                <div className="text-[30px] font-bold">
                  {information
                    ? parseFloat(
                        information.total_net_sales.toFixed(2)
                      ).toLocaleString() + " $"
                    : "..."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              <div>
                <div className="text-[20px] font-bold">Countries</div>
                <div className="text-[30px] font-bold">
                  {information ? information.number_of_countries : "..."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              <div>
                <div className="text-[20px] font-bold">Stores</div>
                <div className="text-[30px] font-bold">
                  {information ? information.total_stores : "..."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 border-r border-r-white pr-20">
              <div>
                <div className="text-[20px] font-bold">Products</div>
                <div className="text-[30px] font-bold">
                  {information ? information.total_products : "..."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div>
                <div className="text-[20px] font-bold">Days</div>
                <div className="text-[30px] font-bold">
                  {information ? information.number_of_days : "..."}
                </div>
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
            <div className="col-span-2">
              <NetSales />
            </div>
            <div className="col-span-1 row-span-2">
              <NetSalesCategory />
            </div>

            <div className="col-span-2">
              <UnitSold />
            </div>
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
        <div className="mt-10" id="top-selling-sku-store">
          <SubTitle text="Top Selling SKU-Store" />

          <h3 className="text-xl font-bold mb-4"></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">No.</th>
                  <th className="px-4 py-2 text-left">SKU ID</th>
                  <th className="px-4 py-2 text-left">Product Name</th>
                  <th className="px-4 py-2 text-left">Supplier ID</th>
                  <th className="px-4 py-2 text-left">Store ID</th>
                  <th className="px-4 py-2 text-left">City</th>
                  <th className="px-4 py-2 text-left">Units Sold</th>
                  <th className="px-4 py-2 text-left">Net Sales</th>
                  <th className="px-4 py-2 text-left">Stock Opening</th>
                  {/* <th className="px-4 py-2 text-left">Lead Time</th> */}
                  <th className="px-4 py-2 text-left">Alert</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr
                    key={product.sku_id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">
                      {product.sku_id ? product.sku_id : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.sku_name ? product.sku_name : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.supplier_id ? product.supplier_id : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.store_id ? product.store_id : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.city ? product.city : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.units_sold ? product.units_sold : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.net_sales
                        ? product.net_sales.toFixed(2)
                        : "null"}
                    </td>
                    <td className="px-4 py-2">
                      {product.stock_opening ? product.stock_opening : "null"}
                    </td>
                    {/* <td className="px-4 py-2">
                      {product.lead_time_days ? product.lead_time_days : "null"}
                    </td> */}
                    <td className="px-4 py-2">
                      <span
                        className={`px-4 py-1 ${
                          index % 4 === 0 ? "bg-red-500" : "bg-green-500"
                        } rounded-sm text-white`}
                      >
                        {index % 4 === 0 ? "Stock Out " : "Stock Out"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* <div className="mt-10" id="stock-alerts">
          <SubTitle text="Stock Alerts" />

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">SKU ID</th>
                  <th className="px-4 py-2 text-left">Product Name</th>
                  <th className="px-4 py-2 text-left">Store ID</th>
                  <th className="px-4 py-2 text-left">Stock on Hand</th>
                  <th className="px-4 py-2 text-left">Avg Daily Sales</th>
                  <th className="px-4 py-2 text-left">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {stockAlerts.map((alert, index) => (
                  <tr
                    key={`${alert.sku_id}-${alert.store_id}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-2">{alert.sku_id}</td>
                    <td className="px-4 py-2">{alert.sku_name}</td>
                    <td className="px-4 py-2">{alert.store_id}</td>
                    <td className="px-4 py-2">{alert.stock_on_hand}</td>
                    <td className="px-4 py-2">
                      {alert.avg_daily_sales.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {alert.days_left ? alert.days_left.toFixed(1) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> */}
      </div>
    </>
  );
}

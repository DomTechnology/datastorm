"use client"

import { Calendar, Filter, Info, Lightbulb, TrendingDown, TrendingUp } from "lucide-react"
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateForAPI } from "../../../utils/date";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar-rac";
import { Badge } from "@/components/ui/badge";
import PaginationComponent from "../PaginationComponent.jsx";
import { useGlobalLoading } from "../../../context/loadingContext.jsx";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";

export const DayOfCover = () => {
  const [productList, setProductList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date("2021-01-01"));

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedStore, setSelectedStore] = useState("all"); // thêm store filter
  const [selectedCity, setSelectedCity] = useState("all"); // thêm city filter

  const { startLoading, stopLoading, isLoading } = useGlobalLoading();

  const [stores, setStores] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/store/list`)
        .then((res) => res.json())
        .then((data) => {
          setStores(data.data);
        });
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/city/list`)
        .then((res) => res.json())
        .then((data) => {
          setCities(data.data);
        });
      stopLoading();
    };

    fetchData();
  }, []);

  useEffect(() => {
    setProductList([]);
    const fetchData = async () => {
      startLoading();
      const date = formatDateForAPI(selectedDate);
      let url = `${process.env.NEXT_PUBLIC_API_URL}/sku/list?date=${date}&page=${currentPage}&limit=10`;
      if (selectedStore) url += `&store_id=${selectedStore}`;
      if (selectedCity) url += `&city=${selectedCity}`;
      await fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.code == "success") {
            setProductList(data.data);
            setTotalPages(data.pagination.total_pages);
          } else {
            setProductList([]);
            setTotalPages(1);
          }
          stopLoading();
        })
    }
    fetchData();
  }, [selectedDate, currentPage, selectedStore, selectedCity]);

  const [sortField, setSortField] = useState(null);
  // "doc" | "day_until_order"

  const [sortDirection, setSortDirection] = useState("desc");
  // "asc" | "desc"


  const renderBadge = (doc) => {
    const days = Math.floor(doc);
    const hours = Math.round((doc - days) * 24);

    if (doc >= 7) return <Badge className="bg-green-100 text-green-800">Healthy - {days} days {hours} hours</Badge>;
    if (doc >= 4) return <Badge className="bg-yellow-100 text-yellow-800">Moderate - {days} days {hours} hours</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low - {days} days {hours} hours</Badge>;
  }

  const renderDayUntilOrder = (dayUntilOrder) => {
    const days = Math.floor(dayUntilOrder);
    const hours = Math.round((dayUntilOrder - days) * 24);

    if (dayUntilOrder < 0) return <Badge><Info size={12} />Must order {Math.abs(days)} days {Math.abs(hours)} hours ago</Badge>;

    if (dayUntilOrder >= 7) return <Badge className="bg-green-100 text-green-800">{days} days {hours} hours</Badge>;
    if (dayUntilOrder >= 4) return <Badge className="bg-yellow-100 text-yellow-800">{days} days {hours} hours</Badge>;
    return <Badge className="bg-red-100 text-red-800">{days} days {hours} hours</Badge>;
  }

  const renderLossSale = (total_units_sold, stock_on_hand, list_price) => {
    const loss = (total_units_sold - stock_on_hand) * list_price;

    return (
      <Badge className="bg-red-100 text-red-800">{loss <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />} {loss.toFixed(2)} $</Badge>
    )
  }

  return (
    <>
      <div>
        <div className="bg-white p-5 rounded-md shadow-md border border-gray-300 w-full mt-5 mb-10">
          <div className="flex items-center gap-5 text-[20px] mb-5">
            <Filter />
            <span>Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* --- Calendar --- */}
            <div className="w-full">
              <Label htmlFor="selected_date" className="flex items-center gap-3 text-[16px] mb-2">
                <Calendar size={16} /> Date
              </Label>
              <DropdownMenu disablePortal={isLoading}>
                <DropdownMenuTrigger asChild>
                  <Input
                    type="text"
                    id="selected_date"
                    name="selected_date"
                    value={selectedDate ? formatDate(selectedDate) : ""}
                    readOnly
                    className="cursor-pointer"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onChange={(date) => {
                      if (date) {
                        const jsDate = date instanceof Date ? date : new Date(date.year, date.month - 1, date.day);
                        setSelectedDate(jsDate);
                      } else {
                        setSelectedDate(new Date("2021-01-01"));
                      }
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* --- Store select --- */}
            <div className="w-full">
              <Label htmlFor="store_id" className="flex items-center gap-3 text-[16px] mb-2">Store</Label>
              <Select
                id="store_id"
                value={selectedStore}
                onValueChange={(value) => setSelectedStore(value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores && stores.length > 0 && stores.map((store) => (
                    <SelectItem key={store} value={store}>{store}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* --- City select --- */}
            <div className="w-full">
              <Label htmlFor="city" className="flex items-center gap-3 text-[16px] mb-2">City</Label>
              <Select
                id="city"
                value={selectedCity}
                onValueChange={(value) => setSelectedCity(value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities && cities.length > 0 && cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* --- Table --- */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 mb-5">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-3">No.</th>
                <th className="px-2 py-3">SKU ID</th>
                <th className="px-2 py-3">Product Name</th>
                {/* <th className="px-4 py-3">Category</th> */}
                {/* <th className="px-4 py-3">Brand</th> */}
                <th className="px-2 py-3">Store ID</th>
                <th className="px-2 py-3">City</th>
                <th className="px-2 py-3">Total Units Sold</th>
                <th className="px-2 py-3">Average Daily Demand</th>
                <th className="px-2 py-3">Stock on hand</th>
                <th className="px-2 py-3">Reorder point <div className="text-nowrap">(Safety Stock = 2)</div></th>
                <th className="px-2 py-3">Day of Coverage</th>
                <th className="px-2 py-3">Day until order</th>
                <th className="px-2 py-3">Suggested Order Quantity</th>
                <th className="px-2 py-3">Loss Sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px] text-slate-700">
              {productList.map((product, index) => (
                <tr key={`${product.sku_id}-${product.store_id}-${index}`} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-900">{index + 1}</td>
                  <td className="px-3 py-3">{product.sku_id ?? "—"}</td>
                  <td className="px-3 py-3">{product.sku_name ?? "—"}</td>
                  {/* <td className="px-3 py-3">{product.category ?? "—"}</td> */}
                  {/* <td className="px-3 py-3">{product.brand ?? "—"}</td> */}
                  <td className="px-3 py-3">{product.store_id ?? "—"}</td>
                  <td className="px-3 py-3">{product.city ?? "—"}</td>
                  <td className="px-3 py-3">{product.total_units_sold ?? "—"}</td>
                  <td className="px-3 py-3">{product.avg_daily_demand ?? "—"}</td>
                  <td className="px-3 py-3"><Badge>{product.stock_on_hand ?? "—"}</Badge></td>
                  <td className="px-3 py-3 font-extrabold"><Badge className="bg-yellow-100 text-yellow-800">{Math.round(product.rop, 2) ?? "—"}</Badge></td>
                  <td className="px-3 py-3 font-extrabold">{renderBadge(product.doc)}</td>
                  <td className="px-3 py-3 font-extrabold">{renderDayUntilOrder(product.day_until_order)}</td>
                  <td className="px-3 py-3 font-extrabold"><Badge className="bg-blue-100 text-blue-500"><Lightbulb size={12} />{Math.round((parseFloat(product.avg_daily_demand) * (parseFloat(product.lead_time_days) + 2)) - parseFloat(product.stock_on_hand))}</Badge></td>
                  <td className="px-3 py-3 font-extrabold">{renderLossSale(product.total_units_sold, product.stock_on_hand, product.list_price)}</td>
                </tr>
              ))}
              {!productList.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                    {isLoading ? "Loading products..." : "No products available yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationComponent
          numberOfPages={totalPages}
          currentPage={currentPage}
          controlPage={setCurrentPage}
        />
      </div>
    </>
  )
}
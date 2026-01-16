"use client"

import { useEffect, useState } from "react"
import { useGlobalLoading } from "../../../context/loadingContext";
import { ShieldCheck } from "lucide-react";

export const TopSKUProduct = () => {
  const [topProducts, setTopProducts] = useState([]);
  const { startLoading, stopLoading, isLoading } = useGlobalLoading();
  
  useEffect(() => {
    const fetchData = async () => {
      startLoading();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sku/top?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          setTopProducts(data.data);
        });
      stopLoading();
    }

    fetchData();
  }, []);
  
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">SKU ID</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Supplier ID</th>
              <th className="px-4 py-3">Store ID</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Units Sold</th>
              <th className="px-4 py-3">Net Sales</th>
              <th className="px-4 py-3">Stock Opening</th>
              <th className="px-4 py-3">Alert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {topProducts.map((product, index) => (
              <tr
                key={`${product.sku_id}-${product.store_id}-${index}`}
                className="hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {index + 1}
                </td>
                <td className="px-4 py-3">{product.sku_id ?? "—"}</td>
                <td className="px-4 py-3">{product.sku_name ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.supplier_id ?? "—"}
                </td>
                <td className="px-4 py-3">{product.store_id ?? "—"}</td>
                <td className="px-4 py-3">{product.city ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.units_sold ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {product.net_sales
                    ? product.net_sales.toFixed(2)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {product.stock_opening ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
                    <ShieldCheck size={14} />
                    Watch
                  </span>
                </td>
              </tr>
            ))}
            {!topProducts.length ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No top-selling SKUs available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
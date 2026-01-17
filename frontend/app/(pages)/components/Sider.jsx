"use client";

import {
  LayoutDashboard,
  BarChart3,
  MapPinned,
  Table2,
  BellRing,
  Layers3,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const Sider = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";
  const isForecasting = pathname.startsWith("/forecasting");

  const navItems = [
    { label: "Guideline", section: "overview", icon: LayoutDashboard },
    { label: "Map", section: "map", icon: MapPinned },
    { label: "Financial", section: "financial", icon: BarChart3 },
    // { label: "Sales", section: "sales", icon: LineChart },
    { label: "Top SKUs", section: "top-sku", icon: Table2 },
    { label: "Stock Alerts", section: "alerts", icon: BellRing },
    { label: "Day of Coverage", section: "doc", icon: BarChart3 },
    { label: "Advanced Analytics", section: "analytics", icon: Layers3 },
  ];

  const linkFor = (section) => ({ pathname: "/", query: { section } });

  return (
    <div className="w-64 h-screen bg-[#313642] fixed left-0 top-0 z-50 text-white pt-10">
      <div className="text-[24px] text-white font-semibold text-center">
        Sale Management Dashboard
      </div>
      <div className="flex flex-col gap-6 mt-10 px-5 text-gray-300">
        <div className="flex flex-col gap-3">
          {navItems.map((item) => {
            const isActive = pathname === "/" && activeSection === item.section;
            const Icon = item.icon;
            return (
              <Link
                key={item.section}
                href={linkFor(item.section)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/5 text-gray-200"
                }`}
                scroll={false}
                prefetch
              >
                <span className="flex items-center gap-2">
                  <Icon size={16} />
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  view
                </span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-4 mt-2 flex flex-col gap-2">
          <Link
            href="/forecasting"
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              isForecasting
                ? "bg-white/10 text-white"
                : "hover:bg-white/5 text-gray-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <LineChart size={16} />
              Forecasting
            </span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400">
              view
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

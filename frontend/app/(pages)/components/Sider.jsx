"use client"

import { ChevronRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export const Sider = () => {
  const pathname = usePathname()
  const isMainPage = pathname === "/"
  const isForecasting = pathname.startsWith("/forecasting")

  const scrollTo = (id, offset = 80) => {
    const el = document.getElementById(id)
    if (!el) return

    const y =
      el.getBoundingClientRect().top +
      window.pageYOffset -
      offset

    window.scrollTo({
      top: y,
      behavior: "smooth",
    })
  }

  const submenuVariants = {
    hidden: { height: 0, opacity: 0 },
    show: {
      height: "auto",
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  }

  return (
    <div className="w-64 h-screen bg-[#313642] fixed left-0 top-0 z-50 text-white pt-20">
      <div className="flex flex-col gap-6 mt-10 px-5 text-gray-300">

        {/* ===== Net Sales ===== */}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full flex justify-between items-center text-lg font-medium hover:scale-[1.02] transition"
          >
            <span>Net Sales Overview</span>
            {isMainPage ? <ChevronDown /> : <ChevronRight />}
          </Link>

          <AnimatePresence initial={false}>
            {isMainPage && (
              <motion.div
                variants={submenuVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="ml-4 flex flex-col gap-3 text-sm text-gray-400 overflow-hidden"
              >
                <button
                  onClick={() => scrollTo("stock-out-rate-to-location", 100)}
                  className="text-left hover:text-white transition"
                >
                  Stock out Rate to Location
                </button>

                <button
                  onClick={() => scrollTo("sales-analysis", 100)}
                  className="text-left hover:text-white transition"
                >
                  Sales Analysis
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Forecasting ===== */}
        <div className="flex flex-col gap-2">
          <Link
            href="/forecasting"
            className={`w-full flex justify-between items-center text-lg font-medium transition
              ${isForecasting ? "text-white" : "hover:scale-[1.02]"}`}
          >
            <span>Forecasting</span>
            {isForecasting ? <ChevronDown /> : <ChevronRight />}
          </Link>

          <AnimatePresence initial={false}>
            {isForecasting && (
              <motion.div
                variants={submenuVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="ml-4 flex flex-col gap-3 text-sm text-gray-400 overflow-hidden"
              >
                <button
                  onClick={() => scrollTo("demand-forecast-results", 100)}
                  className="text-left hover:text-white transition"
                >
                  Demand Forecast Results
                </button>

                <button
                  onClick={() => scrollTo("lead-time-prediction-results", 100)}
                  className="text-left hover:text-white transition"
                >
                  Lead Time Prediction Results
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
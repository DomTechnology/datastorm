import { create } from "zustand";

// Fixed default window to avoid realtime drift; dataset covers 2021-01-01..2023-12-31
const DEFAULT_START = "2022-01-01";
const DEFAULT_END = "2023-12-31";
const DEFAULT_YEARS = ["2021", "2022", "2023"];

export const useFilterStore = create((set) => ({
  countries: [],
  channels: [],
  suppliers: [],
  yearList: DEFAULT_YEARS,
  selectedCountry: "all",
  selectedYear: "2022",
  selectedMonth: "all",
  selectedChannel: "all",
  selectedSupplier: "all",
  startDate: DEFAULT_START,
  endDate: DEFAULT_END,
  setCountries: (countries) => set({ countries }),
  setChannels: (channels) => set({ channels }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setYearList: (yearList) => set({ yearList: yearList }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedChannel: (channel) => set({ selectedChannel: channel }),
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
}));

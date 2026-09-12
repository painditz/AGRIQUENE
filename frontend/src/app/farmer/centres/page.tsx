"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import {
  Building2, MapPin, Users, Clock, ArrowRight, Navigation, RefreshCw,
  Search, SlidersHorizontal, CheckCircle, ExternalLink
} from "lucide-react";

type SortOption = "nearest" | "shortestQueue" | "lowestWait" | "availableSlots";

export default function FarmerCentresPage() {
  const { t } = useLanguage();
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("nearest");
  const [directionModalCentre, setDirectionModalCentre] = useState<CentreItem | null>(null);

  const fetchCentres = async () => {
    setLoading(true);
    try {
      const data = await api.getCentres();
      setCentres(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const filteredCentres = useMemo(() => {
    let result = centres.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === "nearest") {
      result.sort((a, b) => a.distance_km - b.distance_km);
    } else if (sortBy === "shortestQueue") {
      result.sort((a, b) => a.current_waiting_count - b.current_waiting_count);
    } else if (sortBy === "lowestWait") {
      result.sort((a, b) => a.estimated_wait_min - b.estimated_wait_min);
    } else if (sortBy === "availableSlots") {
      result.sort((a, b) => b.available_slots_today - a.available_slots_today);
    }

    return result;
  }, [centres, searchQuery, sortBy]);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              NEARBY MANDIS & APMC CENTRES
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              Procurement Centre Radar
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare live mandi lines, AI waiting forecasts, and counter velocities before booking your slot.
            </p>
          </div>
          <button
            onClick={fetchCentres}
            disabled={loading}
            className="btn-gov-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold self-start sm:self-auto min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Status"}</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchCentres")}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] min-h-[44px]"
              />
            </div>

            {/* Sorting Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 pr-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3 h-3" /> Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy("nearest")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap min-h-[36px] ${
                  sortBy === "nearest"
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("filterNearest")}
              </button>
              <button
                type="button"
                onClick={() => setSortBy("shortestQueue")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap min-h-[36px] ${
                  sortBy === "shortestQueue"
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("filterShortestQueue")}
              </button>
              <button
                type="button"
                onClick={() => setSortBy("lowestWait")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap min-h-[36px] ${
                  sortBy === "lowestWait"
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("filterLowestWait")}
              </button>
              <button
                type="button"
                onClick={() => setSortBy("availableSlots")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap min-h-[36px] ${
                  sortBy === "availableSlots"
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Most Slots
              </button>
            </div>
          </div>
        </div>

        {/* Mandi Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCentres.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm hover:border-[#0B2545] hover:shadow transition flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-[#0B2545]">{c.name}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0" />
                      <span>{c.district}, {c.state} (~{c.distance_km} km away)</span>
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Telemetry Numbers Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-md text-xs border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Queue</span>
                    <p className="text-xl font-black text-[#0B2545] font-mono mt-0.5">{c.current_waiting_count}</p>
                    <span className="text-[10px] text-slate-500">Farmers in line</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">AI Est. Wait</span>
                    <p className="text-xl font-black text-[#B91C1C] font-mono mt-0.5">{c.estimated_wait_min}m</p>
                    <span className="text-[10px] text-slate-500">Live Forecast</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Available Slots</span>
                    <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">{c.available_slots_today}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">Today</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-white p-2 rounded border border-slate-100">
                  <p className="flex items-center justify-between">
                    <span>Active Weighbridge Counters:</span>
                    <strong className="font-mono text-[#0B2545] font-bold">{c.active_counters} Operating</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Hours:</span>
                    <span className="text-slate-500 font-medium">{t("operatingHours")}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setDirectionModalCentre(c)}
                  className="btn-gov-outline text-xs py-2 px-3 font-semibold flex items-center gap-1.5 min-h-[44px]"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>Get Route</span>
                </button>
                <Link
                  href={`/farmer/book?centre=${c.id}`}
                  className="btn-gov-primary text-xs py-2 px-4 font-bold flex-1 text-center min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <span>Book Slot Here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filteredCentres.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-md p-8 text-center text-xs text-slate-500">
              No procurement centres match your search. Try clearing the filter.
            </div>
          )}
        </div>

        {/* Directions Modal */}
        {directionModalCentre && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-md max-w-md w-full p-5 shadow-2xl border border-slate-300 space-y-4">
              <div className="flex items-start justify-between border-b pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#B91C1C]">ROUTE & GATE ACCESS</span>
                  <h3 className="text-base font-bold text-[#0B2545]">{directionModalCentre.name}</h3>
                </div>
                <button
                  onClick={() => setDirectionModalCentre(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <p className="font-bold text-[#0B2545]">Physical Address:</p>
                  <p className="mt-0.5 text-slate-600">{directionModalCentre.address || "Main Mandi Yard, GT Road Bypass, District Mandi Samiti"}</p>
                  <p className="mt-1 font-mono text-slate-500">Transit Distance: ~{directionModalCentre.distance_km} km (Est. Travel: ~25 mins by tractor/trolley)</p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800">Gate Arrival Advice:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Enter through Weighbridge Gate 2 (Commercial Trolleys).</li>
                    <li>Keep your digital token SMS or printout ready for scanner verification.</li>
                    <li>Ensure produce sample bags are easily accessible for moisture testing.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setDirectionModalCentre(null)}
                  className="btn-gov-outline text-xs py-2 px-4 font-semibold"
                >
                  Close
                </button>
                <Link
                  href={`/farmer/book?centre=${directionModalCentre.id}`}
                  className="btn-gov-primary text-xs py-2 px-4 font-bold"
                  onClick={() => setDirectionModalCentre(null)}
                >
                  Book Slot at this Centre
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}


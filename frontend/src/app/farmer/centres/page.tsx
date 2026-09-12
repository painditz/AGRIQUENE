"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building2, MapPin, Users, Clock, ArrowRight, Navigation, RefreshCw } from "lucide-react";

export default function FarmerCentresPage() {
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCentres() {
      try {
        const data = await api.getCentres();
        setCentres(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchCentres();
  }, []);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              NEARBY MANDIS & APMC CENTRES
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Procurement Centre Radar
            </h1>
            <p className="text-xs text-slate-500">
              Check live queues and active counters before starting your journey.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); api.getCentres().then(setCentres).finally(() => setLoading(false)); }}
            className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centres.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded p-4 shadow-sm hover:border-[#0B2545] transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#0B2545]">{c.name}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>{c.district}, {c.state} (~{c.distance_km} km away)</span>
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded text-xs border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Queue Length</span>
                    <p className="text-base font-black text-[#0B2545] font-mono">{c.current_waiting_count} Waiting</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">AI Est. Wait</span>
                    <p className="text-base font-black text-[#B91C1C] font-mono">{c.estimated_wait_min} Min</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>Active Counters: <strong className="font-mono">{c.active_counters} Open</strong></p>
                  <p>Available Slots Today: <strong className="text-emerald-700 font-mono">{c.available_slots_today} slots</strong></p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t flex items-center justify-between gap-2">
                <Link
                  href={`/farmer/book?centre=${c.id}`}
                  className="btn-gov-primary text-xs py-1.5 px-4 font-bold flex-1 text-center"
                >
                  Book Slot at this Mandi
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FarmerLayout>
  );
}

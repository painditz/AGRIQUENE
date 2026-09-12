"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api, SlotItem, CentreItem } from "@/lib/api";
import { Calendar, Sliders, CheckCircle2, RefreshCw, Building2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function AdminSlotsPage() {
  const { user } = useAuth();
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available centres
  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    async function loadCentres() {
      try {
        const data = await api.getCentres();
        setCentres(data);
        if (data.length > 0 && !selectedCentreId) {
          setSelectedCentreId(data[0].id);
        }
      } catch {}
    }
    loadCentres();
  }, [selectedCentreId]);

  // Load slots for selected centre
  useEffect(() => {
    if (!selectedCentreId) return;
    async function load() {
      setLoading(true);
      try {
        const data = await api.getCentreSlots(selectedCentreId as number);
        setSlots(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCentreId]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              SLOT SCHEDULER & LOAD LEVELLING
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Procurement Slot Quotas
            </h1>
            <p className="text-xs text-slate-500">
              Control hourly capacity allocations to prevent peak morning vehicle gridlocks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Mandi:</label>
            <select
              value={selectedCentreId || ""}
              onChange={(e) => setSelectedCentreId(parseInt(e.target.value))}
              className="p-2 border border-slate-300 rounded text-xs bg-white font-bold text-[#0B2545] outline-none"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Date</th>
                  <th className="p-2.5 font-bold">Time Window</th>
                  <th className="p-2.5 font-bold text-center">Max Capacity</th>
                  <th className="p-2.5 font-bold text-center">Booked Tokens</th>
                  <th className="p-2.5 font-bold text-center">Available Capacity</th>
                  <th className="p-2.5 font-bold text-center">Workload Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {slots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 font-sans">
                    <td className="p-2.5 font-mono text-[#0B2545] font-bold">{s.date}</td>
                    <td className="p-2.5 font-mono">{s.start_time} – {s.end_time}</td>
                    <td className="p-2.5 text-center font-mono">{s.capacity} Trolleys</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#B91C1C]">{s.booked_count} Booked</td>
                    <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">
                      {s.available_count} Left
                    </td>
                    <td className="p-2.5 text-center">
                      {s.is_recommended ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          ★ Recommended Slot
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

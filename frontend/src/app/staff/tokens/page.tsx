"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { staffApi, CentreQueueStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Ticket, Search, RefreshCw, Filter, Scale } from "lucide-react";
import Link from "next/link";

export default function StaffTokensPage() {
  const { user } = useAuth();
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const centreId = user?.centreId || 1;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await staffApi.getCentreQueue(centreId);
      setQueueStatus(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [centreId]);

  const items = (queueStatus?.queue || []).filter((q) => {
    if (filter !== "ALL" && q.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.token_display.toLowerCase().includes(s) ||
      q.farmer_name.toLowerCase().includes(s) ||
      q.crop.toLowerCase().includes(s)
    );
  });

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
              STREAM INTAKE
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Token Processing Stream
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lifecycle status of all tokens issued for this procurement centre today.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {["ALL", "WAITING", "ARRIVED", "CALLED", "PROCESSING"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === f
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token # or farmer..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-[#0B2545]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Token Stream...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No tokens currently in this state.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Token #</th>
                    <th className="p-3">Farmer</th>
                    <th className="p-3">Produce</th>
                    <th className="p-3">Slot Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Est. Wait</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((t) => (
                    <tr key={t.token_id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-lg text-[#0B2545]">
                        {t.token_display}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{t.farmer_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{t.farmer_mobile_masked}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">{t.crop}</span>
                        <span className="text-slate-500 text-[10px] block">{t.quantity_quintals} Qtl</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {t.slot_date} ({t.slot_time})
                      </td>
                      <td className="p-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700">
                        {t.status === "WAITING" ? `${t.estimated_wait_min} min` : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/staff/procurement?token_id=${t.token_id}`}
                          className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#133E68] text-white rounded font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Scale className="w-3 h-3" />
                          <span>Process</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}

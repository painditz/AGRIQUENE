"use client";

import React, { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Sliders, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

export default function BuyerCountersPage() {
  const { user } = useAuth();
  const [centreData, setCentreData] = useState<any>(null);
  const [activeCounters, setActiveCounters] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const centreId = user?.centreId || 1;

  const loadData = async () => {
    try {
      const data = await api.getBuyerDashboard(centreId);
      setCentreData(data);
      setActiveCounters(data.active_counters);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, [centreId]);

  const handleUpdateCounters = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.updateActiveCounters(centreId, activeCounters);
      setStatusMsg(res.message);
      await loadData();
    } catch (err: any) {
      setStatusMsg(err.message || "Failed to update counters");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            CAPACITY ORCHESTRATION
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Active Weighbridge Counters Management
          </h1>
          <p className="text-xs text-slate-500">
            Open or close physical weighing counters. Changes immediately adjust AI waiting-time forecasts across all farmer screens.
          </p>
        </div>

        {statusMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6 max-w-xl">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Select Number of Operational Weighbridge Counters
            </label>

            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setActiveCounters(num)}
                  className={`p-3 rounded border text-sm font-black font-mono transition ${
                    activeCounters === num
                      ? "bg-[#0B2545] text-white border-[#0B2545] ring-2 ring-blue-300"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-600">
              Currently configured: <strong className="text-[#0B2545]">{activeCounters} active counters</strong> (Total installed at mandi: 6).
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-950 space-y-1">
            <p className="font-bold">Real-Time Queue Impact:</p>
            <p>
              Increasing counters increases throughput and lowers estimated wait times for all connected farmers in real time via WebSockets.
            </p>
          </div>

          <button
            onClick={handleUpdateCounters}
            disabled={loading}
            className="btn-gov-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
            <span>Apply & Broadcast Counter Changes</span>
          </button>
        </div>
      </div>
    </BuyerLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Sliders, CheckCircle2, RefreshCw, AlertCircle, Scale, Users } from "lucide-react";

export default function StaffCountersPage() {
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
    <StaffLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
            OPERATIONAL CAPACITY
          </span>
          <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
            Active Weighbridge Counters Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Open or close physical weighing counters. Changes immediately adjust AI waiting-time forecasts across all farmer screens.
          </p>
        </div>

        {statusMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Physical Weighbridge Counters Currently Open
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max={centreData?.total_counters || 6}
                value={activeCounters}
                onChange={(e) => setActiveCounters(parseInt(e.target.value, 10))}
                className="w-full accent-[#0B2545] cursor-pointer"
              />
              <span className="font-mono text-2xl font-black text-[#0B2545] w-12 text-center bg-slate-100 p-2 rounded-lg">
                {activeCounters}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total physical counters installed at centre: {centreData?.total_counters || 6}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border text-xs space-y-2">
            <p className="font-bold text-[#0B2545]">Operational Impact Forecast:</p>
            <p className="text-slate-600">
              Estimated farmer service throughput: <strong>~{activeCounters * 8} quintals / hour</strong>
            </p>
            <p className="text-slate-600">
              Dynamic ETA queue damping factor: <strong>{activeCounters >= 3 ? "Normal (Fast)" : "Heavy Load"}</strong>
            </p>
          </div>

          <button
            onClick={handleUpdateCounters}
            disabled={loading}
            className="w-full bg-[#0B2545] hover:bg-[#133E68] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Adjusting Counters...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Publish Active Counter Update</span>
              </>
            )}
          </button>
        </div>
      </div>
    </StaffLayout>
  );
}

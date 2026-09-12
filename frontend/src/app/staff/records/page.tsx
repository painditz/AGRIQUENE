"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { staffApi, CentreQueueStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ScrollText, Search, RefreshCw, Printer, CheckCircle2, Scale } from "lucide-react";

export default function StaffRecordsPage() {
  const { user } = useAuth();
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
              PROCUREMENT ARCHIVE
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Procurement & Weighment Records
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Certified electronic weighment slips and receipts issued at this procurement centre.
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

        {/* Metric Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Total Weighment Slips Issued Today</p>
            <p className="text-3xl font-black text-[#0B2545] mt-1 font-mono">
              {queueStatus?.total_completed_today || 0} Slips
            </p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
            Aadhaar DBT Synced
          </span>
        </div>

        {/* Ledger Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
          <ScrollText className="w-12 h-12 text-[#0B2545] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-slate-800 font-serif">
            Official Weighment Slips Ledger
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All executed procurement receipts are automatically mirrored into the Ministry of Consumer Affairs, Food & Public Distribution central registry and Aadhaar PFMS portal.
          </p>
        </div>
      </div>
    </StaffLayout>
  );
}

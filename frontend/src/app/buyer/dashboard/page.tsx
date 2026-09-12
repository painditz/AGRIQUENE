"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { StatsCard } from "@/components/ui/StatsCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar, Users, CheckCircle2, Sliders, Clock,
  Activity, ArrowRight, Play, RefreshCw
} from "lucide-react";

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await api.getBuyerDashboard(user?.centreId);
      setStats(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.centreId]);

  const today = stats?.today_stats || {
    total_bookings: 0,
    waiting_farmers: 0,
    completed_procurements: 0,
    active_counters: 0,
    avg_processing_time_min: 0,
    workload_pct: 0,
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              APMC OPERATIONS DESK
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              {stats?.centre_name || (loading ? "Loading Mandi Desk..." : "Mandi Operations Desk")}
            </h1>
            <p className="text-xs text-slate-500">
              Mandi Code: <span className="font-mono font-bold text-slate-800">{stats?.centre_code || "—"}</span> · Counter #1
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/buyer/queue"
              className="btn-gov-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Open Live Queue Deck</span>
            </Link>
          </div>
        </div>

        {/* Operational KPI Grid (Requirement 19) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Today's Bookings"
            value={today.total_bookings}
            subtitle="Scheduled tokens"
            icon={Calendar}
            variant="navy"
          />
          <StatsCard
            title="Waiting Farmers"
            value={today.waiting_farmers}
            subtitle="In active mandi queue"
            icon={Users}
            variant="red"
          />
          <StatsCard
            title="Completed"
            value={today.completed_procurements}
            subtitle="Procured & weighted"
            icon={CheckCircle2}
            variant="green"
          />
          <StatsCard
            title="Active Counters"
            value={`${today.active_counters} Open`}
            subtitle="Weighbridge capacity"
            icon={Sliders}
            variant="amber"
          />
          <StatsCard
            title="Avg Processing"
            value={`${today.avg_processing_time_min} min`}
            subtitle="Per tractor trolley"
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Current Serving & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Serving Card */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
                Currently Serving Produce on Counter #1
              </h3>
              <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded">
                LIVE ON WEIGHBRIDGE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Token Number</p>
                <p className="text-3xl font-black text-[#B91C1C] font-mono mt-0.5">
                  {stats?.current_serving?.token_display || "#114"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Farmer & Crop</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {stats?.current_serving?.farmer_name || "Suresh Yadav"}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {stats?.current_serving?.crop || "Wheat"} ({stats?.current_serving?.quantity || 40} Qtl)
                </p>
              </div>

              <div className="flex items-center sm:justify-end">
                <Link
                  href="/buyer/procurement"
                  className="btn-gov-primary text-xs py-2 px-4 font-bold"
                >
                  Enter Produce Weights
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/buyer/queue"
                className="text-xs text-[#0B2545] font-bold hover:underline flex items-center gap-1"
              >
                <span>View all waiting tokens in queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Mandi Capacity Gauge */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Mandi Capacity Workload
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Yard Congestion:</span>
                <strong className="text-[#0B2545]">{today.workload_pct}% Capacity</strong>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all"
                  style={{ width: `${today.workload_pct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Operating smoothly with {today.active_counters} weighbridge lines.
              </p>
            </div>

            <div className="pt-3 border-t">
              <Link
                href="/buyer/counters"
                className="btn-gov-outline w-full text-center text-xs py-2 block font-bold"
              >
                Manage Active Counters
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

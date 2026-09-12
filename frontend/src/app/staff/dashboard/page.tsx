"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { staffApi, CentreQueueStatus } from "@/lib/api";
import { useQueueSocket } from "@/context/QueueSocketContext";
import {
  Building2, Users, Activity, Scale, Clock, Sliders,
  CheckCircle2, ArrowRight, Play, RefreshCw, Volume2,
  Calendar, Award, AlertCircle, FileCheck2
} from "lucide-react";

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { lastEvent, playAlertSound, setActiveCentreId } = useQueueSocket();

  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);

  const centreId = user?.centreId || 1;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      setActiveCentreId(centreId);
      const data = await staffApi.getCentreQueue(centreId);
      setQueueStatus(data);
    } catch {
      showToast("Unable to refresh operational queue", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [centreId]);

  useEffect(() => {
    if (lastEvent) {
      loadDashboard();
      if (lastEvent.type === "TOKEN_CALLED") {
        playAlertSound();
      }
    }
  }, [lastEvent]);

  const handleQuickCallNext = async () => {
    setCallingNext(true);
    try {
      const res = await staffApi.callNextToken(1, centreId);
      showToast(res.message || "Token called to Counter #1", "success");
      loadDashboard();
    } catch (err: any) {
      showToast(err?.message || "No waiting farmers in queue to call", "warning");
    } finally {
      setCallingNext(false);
    }
  };

  const waitingFarmers = queueStatus?.queue?.filter((q) => q.status === "WAITING") || [];
  const arrivedFarmers = queueStatus?.queue?.filter((q) => q.status === "ARRIVED") || [];
  const servingItem = queueStatus?.queue?.find((q) => q.status === "CALLED" || q.status === "PROCESSING");

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Mandi Operational Status Banner */}
        <div className="bg-[#0B2545] text-white p-6 rounded-2xl shadow-md border border-[#133E68] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-[#0B2545] text-xs font-black px-2.5 py-0.5 rounded uppercase">
                Assigned Centre
              </span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Receiving Active
              </span>
            </div>
            <h1 className="text-2xl font-black font-serif mt-2">
              {queueStatus?.centre_name || user?.centreName || "Ghaziabad APMC Mandi"}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Active Weighbridge Counter #1 • 4 Active Inspection Counters • Throughput: {queueStatus?.avg_processing_time_min || 8} min / vehicle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickCallNext}
              disabled={callingNext || (waitingFarmers.length === 0 && arrivedFarmers.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{callingNext ? "Calling..." : "Call Next Farmer"}</span>
            </button>

            <Link
              href="/staff/procurement"
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition"
            >
              <Scale className="w-4 h-4" />
              <span>Open Weighbridge</span>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Currently Serving</span>
            <p className="text-3xl font-black font-mono text-[#0B2545] mt-1">
              {queueStatus?.current_serving_token || "None"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {servingItem ? `${servingItem.farmer_name} (${servingItem.crop})` : "Counter Ready"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Waiting at Gate</span>
            <p className="text-3xl font-black text-amber-600 mt-1">
              {queueStatus?.total_waiting || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {arrivedFarmers.length} arrived & verified
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Est. Average Processing</span>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {queueStatus?.avg_processing_time_min || 8.0}m
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Weigh + Moisture + Sampling
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Completed Today</span>
            <p className="text-3xl font-black text-emerald-700 mt-1">
              {queueStatus?.total_completed_today || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Weighment slips issued
            </p>
          </div>
        </div>

        {/* Live Operational Stream & Quick Processing Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Serving Token Detail */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border-2 border-[#0B2545] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Weighbridge Active Slot
              </span>
              <span className="bg-blue-100 text-blue-900 text-xs font-mono font-bold px-2 py-0.5 rounded">
                Desk #1
              </span>
            </div>

            {servingItem ? (
              <div className="space-y-4">
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Token Number</span>
                  <span className="text-4xl font-black font-mono text-[#0B2545] block mt-1">
                    {servingItem.token_display}
                  </span>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full mt-2">
                    Status: {servingItem.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Farmer Name</span>
                    <span className="font-bold text-slate-900">{servingItem.farmer_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Mobile</span>
                    <span className="font-mono text-slate-900">{servingItem.farmer_mobile_masked}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Declared Crop</span>
                    <span className="font-bold text-slate-900">{servingItem.crop}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Est. Quantity</span>
                    <span className="font-bold text-emerald-800">{servingItem.quantity_quintals} Quintals</span>
                  </div>
                </div>

                <Link
                  href={`/staff/procurement?token_id=${servingItem.token_id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#0B2545] hover:bg-[#133E68] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow transition"
                >
                  <Scale className="w-4 h-4" />
                  <span>Enter Weighment & Complete</span>
                </Link>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <Scale className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold">No token currently called at this counter.</p>
                <button
                  onClick={handleQuickCallNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                >
                  Call Next Waiting Farmer
                </button>
              </div>
            )}
          </div>

          {/* Up Next in Queue */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-[#0B2545] font-serif">
                  Upcoming Farmers in Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time synchronization with mandi gate entry
                </p>
              </div>
              <Link
                href="/staff/queue"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0B2545] hover:underline"
              >
                <span>Full Queue Manager</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0B2545] mx-auto mb-2" />
                <p className="text-xs text-slate-500">Refreshing Live Queue...</p>
              </div>
            ) : waitingFarmers.length === 0 && arrivedFarmers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No farmers currently waiting in queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...arrivedFarmers, ...waitingFarmers].slice(0, 5).map((item) => (
                  <div
                    key={item.token_id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 font-mono font-bold text-slate-800 flex items-center justify-center text-xs">
                        #{item.position || "—"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{item.farmer_name}</span>
                          <span className="font-mono text-[11px] font-bold text-[#0B2545]">
                            {item.token_display}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {item.crop} • {item.quantity_quintals} Qtl • Est. wait: {item.estimated_wait_min}m
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.status === "ARRIVED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                      <Link
                        href={`/staff/queue`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

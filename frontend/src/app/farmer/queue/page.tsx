"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { QueueVisualizer } from "@/components/ui/QueueVisualizer";
import { ETACard } from "@/components/ui/ETACard";
import { DepartureAdvisory } from "@/components/ui/DepartureAdvisory";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { api, TokenItem, CentreQueueStatus } from "@/lib/api";
import {
  Activity, Users, Clock, Building2,
  RefreshCw, CheckCircle2, ArrowRight, MapPin, Volume2
} from "lucide-react";

export default function FarmerLiveQueuePage() {
  const { user } = useAuth();
  const { lastEvent, isConnected } = useQueueSocket();

  const [token, setToken] = useState<TokenItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);

  const loadData = async () => {
    try {
      const tokenData = await api.getFarmerCurrentToken();
      if (tokenData) {
        setToken(tokenData);
        const qData = await api.getCentreQueue(tokenData.centre_id);
        setQueueStatus(qData);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When WebSocket fires an event (such as TOKEN_CALLED or COUNTERS_UPDATED)
  useEffect(() => {
    if (lastEvent) {
      loadData();
    }
  }, [lastEvent]);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Top Queue Telemetry Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                REAL-TIME TELEMETRY FEED
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Live Mandi Queue & ETA Radar
            </h1>
            <p className="text-xs text-slate-500">
              Procurement Centre: <strong className="text-slate-800">{token?.centre_name || "Agri Procurement Centre – Ghaziabad Mandi"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Live Queue Cards Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Currently Serving */}
          <div className="bg-rose-50 border-2 border-[#B91C1C] rounded p-4 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              Currently Serving
            </span>
            <p className="text-3xl font-black text-[#B91C1C] font-mono">
              {queueStatus?.current_serving_token || "#114"}
            </p>
            <p className="text-xs text-rose-800 font-semibold">
              Weighbridge Counter #1
            </p>
          </div>

          {/* 2. Your Token */}
          <div className="bg-amber-50 border-2 border-amber-500 rounded p-4 shadow-sm space-y-1 ring-1 ring-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Your Token Number
            </span>
            <p className="text-3xl font-black text-[#0B2545] font-mono">
              {token?.token_display || "#128"}
            </p>
            <p className="text-xs text-amber-900 font-bold">
              Position in Queue: #{token?.current_position || 14}
            </p>
          </div>

          {/* 3. Farmers Ahead */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Farmers Ahead
            </span>
            <p className="text-3xl font-black text-slate-900 font-mono">
              {token?.current_position || 14}
            </p>
            <p className="text-xs text-slate-600">
              Waiting for turn at counters
            </p>
          </div>

          {/* 4. Active Counters */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Mandi Counters
            </span>
            <p className="text-3xl font-black text-[#0B2545] font-mono">
              {queueStatus?.active_counters || 4}
            </p>
            <p className="text-xs text-emerald-700 font-semibold">
              Avg Pace: {queueStatus?.avg_processing_time_min || 8} min / trolley
            </p>
          </div>
        </div>

        {/* Visual Token Progression Chain */}
        {queueStatus && (
          <QueueVisualizer
            queue={queueStatus.queue}
            userTokenDisplay={token?.token_display || "#128"}
            servingTokenDisplay={queueStatus.current_serving_token || "#114"}
            currentPosition={token?.current_position || 14}
          />
        )}

        {/* AI ETA Card & Departure Advisory */}
        {token && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ETACard
                waitMinutes={token.predicted_wait_minutes}
                expectedTurnTime={token.expected_turn_time}
                isDemoPrediction={false}
                modelVersion="XGBoost-v1.0"
                confidenceScore={0.94}
                onRefresh={loadData}
                isLoading={loading}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col justify-between">
              <DepartureAdvisory
                expectedTurnTime={token.expected_turn_time}
                waitMinutes={token.predicted_wait_minutes}
                recommendedDepartureTime={token.recommended_departure_time}
                departureAdvice={token.departure_advice}
                urgency={token.predicted_wait_minutes <= 20 ? "high" : "normal"}
                travelTimeMin={25}
              />
            </div>
          </div>
        )}

        {/* Full Queue Table */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Detailed Live Queue Schedule (Today)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Total Waiting: {queueStatus?.total_waiting || 14}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Pos</th>
                  <th className="p-2.5 font-bold">Token</th>
                  <th className="p-2.5 font-bold">Farmer Name</th>
                  <th className="p-2.5 font-bold">Crop & Qty</th>
                  <th className="p-2.5 font-bold">Est. Wait</th>
                  <th className="p-2.5 font-bold">Expected Turn</th>
                  <th className="p-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {queueStatus?.queue.map((item) => {
                  const isUser = item.token_display === (token?.token_display || "#128");
                  return (
                    <tr
                      key={item.token_id}
                      className={
                        isUser
                          ? "bg-amber-50 font-bold border-l-4 border-l-amber-500"
                          : item.status === "CALLED" || item.status === "PROCESSING"
                          ? "bg-rose-50/60 font-semibold"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="p-2.5 font-mono">
                        {item.position === 0 ? "Serving" : `#${item.position}`}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#0B2545]">
                        {item.token_display} {isUser && "(YOU)"}
                      </td>
                      <td className="p-2.5">{item.farmer_name}</td>
                      <td className="p-2.5">{item.crop} ({item.quantity_quintals} Qtl)</td>
                      <td className="p-2.5 font-mono font-bold text-[#B91C1C]">
                        {item.estimated_wait_min} min
                      </td>
                      <td className="p-2.5 font-mono">{item.expected_turn_time}</td>
                      <td className="p-2.5">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}

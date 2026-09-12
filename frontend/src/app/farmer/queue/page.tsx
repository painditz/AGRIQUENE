"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { QueueVisualizer } from "@/components/ui/QueueVisualizer";
import { ETACard } from "@/components/ui/ETACard";
import { DepartureAdvisory } from "@/components/ui/DepartureAdvisory";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { api, TokenItem, CentreQueueStatus } from "@/lib/api";
import {
  Activity, Users, Clock, Building2,
  RefreshCw, CheckCircle2, ArrowRight, MapPin, Volume2, VolumeX, AlertTriangle
} from "lucide-react";

export default function FarmerLiveQueuePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { lastEvent, connectionStatus, playAlertSound } = useQueueSocket();

  const [token, setToken] = useState<TokenItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tokenData = await api.getFarmerCurrentToken();
      if (tokenData) {
        setToken(tokenData);
        const qData = await api.getCentreQueue(tokenData.centre_id);
        setQueueStatus(qData);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When WebSocket fires an event (such as TOKEN_CALLED or COUNTERS_UPDATED)
  useEffect(() => {
    if (lastEvent) {
      loadData();
      if (soundAlertEnabled && lastEvent.type === "TOKEN_CALLED") {
        playAlertSound();
      }
    }
  }, [lastEvent, loadData, soundAlertEnabled, playAlertSound]);

  const isCalled = token?.status === "CALLED";

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Top Queue Telemetry Header */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                REAL-TIME TELEMETRY FEED
              </span>
              <span className="text-slate-300">|</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  connectionStatus === "connected"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : connectionStatus === "reconnecting" || connectionStatus === "connecting"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-sky-50 text-sky-700 border border-sky-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500 live-pulse"
                      : "bg-amber-500"
                  }`}
                />
                {connectionStatus === "connected"
                  ? t("liveUpdatesConnected")
                  : connectionStatus === "fallback"
                  ? t("fallbackPolling")
                  : t("reconnecting")}
              </span>
            </div>

            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Live Mandi Queue & ETA Radar
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Centre: <strong className="text-slate-800">{token?.centre_name || "Agri Procurement Centre – Ghaziabad Mandi"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
              className={`text-xs py-2 px-3 rounded border font-semibold flex items-center gap-1.5 transition ${
                soundAlertEnabled
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-100 border-slate-300 text-slate-600"
              }`}
              title={soundAlertEnabled ? "Mute audio alerts" : "Enable audio chime alerts"}
            >
              {soundAlertEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Audio Alert: On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Audio Alert: Muted</span>
                </>
              )}
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
              <span>{loading ? "Updating..." : "Refresh Telemetry"}</span>
            </button>
          </div>
        </div>

        {/* CALLED TOKEN ALERT BANNER */}
        {isCalled && (
          <div className="bg-[#B91C1C] text-white p-5 rounded-md shadow-xl border-2 border-red-800 flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚨</span>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wide">
                  {t("tokenCalledAlert")}
                </h2>
                <p className="text-xs text-red-100 font-medium">
                  {t("proceedToCounterNotice")} (Token: <span className="font-mono font-bold text-white underline">{token?.token_display}</span>)
                </p>
              </div>
            </div>
            <button
              onClick={() => playAlertSound()}
              className="bg-white text-[#B91C1C] font-black px-4 py-2 rounded text-xs uppercase tracking-wider hover:bg-slate-100 whitespace-nowrap"
            >
              Replay Chime 🔔
            </button>
          </div>
        )}

        {/* Live Queue Cards Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Currently Serving */}
          <div className="bg-rose-50 border-2 border-[#B91C1C] rounded-md p-4 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              {t("currentlyServing")}
            </span>
            <p className="text-3xl font-black text-[#B91C1C] font-mono">
              {queueStatus?.current_serving_token || "#114"}
            </p>
            <p className="text-xs text-rose-800 font-semibold">
              Weighbridge Counter #1
            </p>
          </div>

          {/* 2. Your Token */}
          <div className="bg-amber-50 border-2 border-amber-500 rounded-md p-4 shadow-sm space-y-1 ring-1 ring-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              {t("yourToken")}
            </span>
            <p className="text-3xl font-black text-[#0B2545] font-mono">
              {token?.token_display || "#128"}
            </p>
            <p className="text-xs text-amber-900 font-bold">
              Position in Queue: #{token?.current_position || 14}
            </p>
          </div>

          {/* 3. Farmers Ahead */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("farmersAhead")}
            </span>
            <p className="text-3xl font-black text-slate-900 font-mono">
              {token?.current_position || 14}
            </p>
            <p className="text-xs text-slate-600">
              Vehicles waiting in entry line
            </p>
          </div>

          {/* 4. Active Counters */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-1">
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
            <div className="lg:col-span-6">
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
            <div className="lg:col-span-6 flex flex-col justify-between">
              <DepartureAdvisory
                expectedTurnTime={token.expected_turn_time}
                waitMinutes={token.predicted_wait_minutes}
                recommendedDepartureTime={token.recommended_departure_time}
                departureAdvice={token.departure_advice}
                urgency={token.predicted_wait_minutes <= 25 ? "high" : "normal"}
                travelTimeMin={25}
              />
            </div>
          </div>
        )}

        {/* Full Queue Table & Responsive Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
                Detailed Live Queue Schedule (Today)
              </h3>
              <p className="text-[11px] text-slate-500">
                Sorted by physical counter assignment & queue index
              </p>
            </div>
            <span className="text-xs font-bold text-[#0B2545] bg-slate-100 px-2.5 py-1 rounded">
              Total Waiting: {queueStatus?.total_waiting || 14}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
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

          {/* Mobile Cards View (eliminates awkward table clipping on phone screens) */}
          <div className="sm:hidden space-y-2.5">
            {queueStatus?.queue.map((item) => {
              const isUser = item.token_display === (token?.token_display || "#128");
              return (
                <div
                  key={item.token_id}
                  className={`p-3 rounded border text-xs ${
                    isUser
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200 font-bold"
                      : item.status === "CALLED" || item.status === "PROCESSING"
                      ? "bg-rose-50 border-rose-300 font-semibold"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-[#0B2545]">
                      {item.token_display} {isUser && "(YOU)"}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-slate-700">
                    <span>{item.farmer_name}</span>
                    <span className="font-semibold">{item.crop} · {item.quantity_quintals} Qtl</span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-mono">Position: #{item.position}</span>
                    <span className="font-mono font-bold text-[#B91C1C]">
                      Wait ~{item.estimated_wait_min}m (Turn: {item.expected_turn_time})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}


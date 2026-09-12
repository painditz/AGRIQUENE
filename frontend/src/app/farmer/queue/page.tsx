"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  RefreshCw, CheckCircle2, ArrowRight, MapPin, Volume2, VolumeX, AlertTriangle, CalendarPlus
} from "lucide-react";

export default function FarmerLiveQueuePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { lastEvent, connectionStatus, playAlertSound, setActiveCentreId } = useQueueSocket();

  const [token, setToken] = useState<TokenItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tokenData = await api.getFarmerCurrentToken().catch(() => null);
      if (tokenData) {
        setToken(tokenData);
        setActiveCentreId(tokenData.centre_id);
        const qData = await api.getCentreQueue(tokenData.centre_id).catch(() => null);
        setQueueStatus(qData);
      } else {
        setToken(null);
        // Load target mandi queue for observation even before booking
        const prof = await api.getFarmerProfile().catch(() => null);
        const targetId = prof?.preferred_centre_id || user?.centreId || 1;
        setActiveCentreId(targetId);
        const qData = await api.getCentreQueue(targetId).catch(() => null);
        setQueueStatus(qData);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [setActiveCentreId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When WebSocket fires an event
  useEffect(() => {
    if (lastEvent) {
      loadData();
      if (soundAlertEnabled && lastEvent.type === "TOKEN_CALLED") {
        playAlertSound();
      }
    }
  }, [lastEvent, loadData, soundAlertEnabled, playAlertSound]);

  // Listen for global mandi change event
  useEffect(() => {
    const handleMandiChanged = () => {
      loadData();
    };
    window.addEventListener("mandi-changed", handleMandiChanged);
    return () => window.removeEventListener("mandi-changed", handleMandiChanged);
  }, [loadData]);

  const isCalled = token?.status === "CALLED";

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Top Queue Header */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                LIVE PROCUREMENT QUEUE
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
                  ? "Live updates on"
                  : connectionStatus === "fallback"
                  ? "Updating automatically"
                  : "Connecting for updates..."}
              </span>
            </div>

            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Live Mandi Queue & Your Turn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Centre: <strong className="text-slate-800">{token?.centre_name || "Agri Procurement Centre"}</strong>
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
              title={soundAlertEnabled ? "Mute audio chime" : "Turn on audio chime"}
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
              <span>{loading ? "Updating..." : "Refresh Queue"}</span>
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
                  It is your turn! Please proceed to the counter.
                </h2>
                <p className="text-xs text-red-100 font-medium">
                  Your token <span className="font-mono font-bold text-white underline">{token?.token_display}</span> has been called at Counter #1.
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

        {/* No Token Empty State */}
        {!token && !loading && (
          <div className="bg-white border-2 border-slate-200 rounded-md p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center mx-auto text-2xl border-2 border-[#0B2545]">
              🌾
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0B2545] font-serif">You have no active token</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                You currently have no active trolley tokens in the queue. Book a slot or locate a nearby mandi to join the queue.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/farmer/centres" className="btn-gov-outline text-xs py-2.5 px-4 font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B91C1C]" />
                <span>Find Mandi Centres</span>
              </Link>
              <Link href="/farmer/book" className="btn-gov-primary text-xs py-2.5 px-5 font-bold flex items-center gap-2">
                <CalendarPlus className="w-4 h-4" />
                <span>Book Slot / Get Token</span>
              </Link>
            </div>
          </div>
        )}

        {/* Live Queue Cards Summary Grid */}
        {token && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Currently Serving */}
              <div className="bg-rose-50 border-2 border-[#B91C1C] rounded-md p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                  Now Serving
                </span>
                <p className="text-3xl font-black text-[#B91C1C] font-mono">
                  {queueStatus?.current_serving_token || "None"}
                </p>
                <p className="text-xs text-rose-800 font-semibold">
                  Weighbridge Counter #1
                </p>
              </div>

              {/* 2. Your Token */}
              <div className="bg-amber-50 border-2 border-amber-500 rounded-md p-4 shadow-sm space-y-1 ring-1 ring-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Your Token
                </span>
                <p className="text-3xl font-black text-[#0B2545] font-mono">
                  {token.token_display}
                </p>
                <p className="text-xs text-amber-900 font-bold">
                  Position in Queue: #{token.current_position}
                </p>
              </div>

              {/* 3. Farmers Ahead */}
              <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  People Ahead of You
                </span>
                <p className="text-3xl font-black text-slate-900 font-mono">
                  {token.current_position}
                </p>
                <p className="text-xs text-slate-600">
                  Trolleys waiting in line
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
                userTokenDisplay={token.token_display}
                servingTokenDisplay={queueStatus.current_serving_token || ""}
                currentPosition={token.current_position}
              />
            )}

            {/* ETA Card & Departure Advisory */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <ETACard
                  waitMinutes={token.predicted_wait_minutes}
                  expectedTurnTime={token.expected_turn_time}
                  isDemoPrediction={false}
                  modelVersion="v1.0"
                  confidenceScore={0.95}
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
          </>
        )}
      </div>
    </FarmerLayout>
  );
}

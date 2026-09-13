"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { ETACard } from "@/components/ui/ETACard";
import { DepartureAdvisory } from "@/components/ui/DepartureAdvisory";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QueueVisualizer } from "@/components/ui/QueueVisualizer";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { useToast } from "@/context/ToastContext";
import { api, TokenItem, CentreQueueStatus } from "@/lib/api";
import {
  CalendarPlus, Activity, FileText, ArrowRight,
  MapPin, Clock, Scale, CreditCard, RefreshCw, AlertTriangle, CheckCircle2,
  Users, AlertCircle, Sparkles, Navigation
} from "lucide-react";

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { lastEvent, connectionStatus, playAlertSound } = useQueueSocket();
  const { showToast } = useToast();

  const [farmerProfile, setFarmerProfile] = useState<any>(null);
  const [token, setToken] = useState<TokenItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // Load real profile from database
      const profileData = await api.getFarmerProfile().catch(() => null);
      if (profileData) {
        setFarmerProfile(profileData);
      }

      // Load active token from database
      const tokenData = await api.getFarmerCurrentToken().catch(() => null);
      if (tokenData) {
        setToken(tokenData);
        const qData = await api.getCentreQueue(tokenData.centre_id).catch(() => null);
        setQueueStatus(qData);
      } else {
        setToken(null);
        setQueueStatus(null);
      }
    } catch (err: unknown) {
      setError("Unable to sync queue updates right now. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When WebSocket fires an event, immediately sync data in background without flashing
  useEffect(() => {
    if (lastEvent) {
      loadData(true);
    }
  }, [lastEvent, loadData]);

  // Listen for global mandi change event
  useEffect(() => {
    const handleMandiChanged = () => {
      loadData();
    };
    window.addEventListener("mandi-changed", handleMandiChanged);
    return () => window.removeEventListener("mandi-changed", handleMandiChanged);
  }, [loadData]);

  // If token changes to CALLED, trigger sound
  useEffect(() => {
    if (token?.status === "CALLED") {
      playAlertSound();
    }
  }, [token?.status, playAlertSound]);

  const farmerName =
    farmerProfile?.full_name && farmerProfile.full_name !== "New Farmer"
      ? farmerProfile.full_name
      : user?.fullName && user.fullName !== "New Farmer"
      ? user.fullName
      : "Farmer";

  const farmerIdDisplay =
    farmerProfile?.farmer_id_card ||
    (user?.mobileNumber ? `PMK-UP-2026-${user.mobileNumber.slice(-4)}` : "Registered Account");

  const farmerLocationDisplay = farmerProfile?.district
    ? `${farmerProfile.village ? farmerProfile.village + ", " : ""}${farmerProfile.district}, ${farmerProfile.state || "India"}`
    : "Location Pending Profile Registration";

  const isCalled = token?.status === "CALLED";

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Real-time Connection Status & Farmer Profile Header */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                PM-KISAN LINKED FARMER ACCOUNT
              </span>
              <span className="text-slate-300">|</span>
              {/* Connection Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                      : connectionStatus === "fallback"
                      ? "bg-sky-500"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                {connectionStatus === "connected"
                  ? "Live updates on"
                  : connectionStatus === "fallback"
                  ? "Updating automatically"
                  : "Connecting for updates..."}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#0B2545] font-serif mt-1">
              Welcome back, {farmerName} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Farmer ID: <span className="font-mono font-bold text-slate-700">{farmerIdDisplay}</span> · Location: {farmerLocationDisplay}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="btn-gov-outline text-xs py-2 px-3 font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
              <span>{loading ? "Updating..." : "Refresh"}</span>
            </button>
            <Link
              href="/farmer/book"
              className="btn-gov-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Book Slot / Join Queue</span>
            </Link>
          </div>
        </div>

        {/* CALLED TOKEN URGENT ALERT BANNER */}
        {isCalled && (
          <div className="bg-[#B91C1C] text-white p-5 rounded-md shadow-xl border-2 border-red-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🔔</span>
              <div>
                <span className="bg-white text-[#B91C1C] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  ACTION REQUIRED NOW
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1">
                  It is your turn! Please proceed to the counter.
                </h2>
                <p className="text-xs text-red-100 font-medium mt-0.5">
                  Your token <strong className="font-mono text-white text-sm underline">{token?.token_display}</strong> has been called. Please drive your trolley to Counter #1.
                </p>
              </div>
            </div>
            <Link
              href="/farmer/queue"
              className="bg-white text-[#B91C1C] hover:bg-slate-100 font-black px-4 py-2.5 rounded text-xs uppercase tracking-wider shadow whitespace-nowrap"
            >
              Open Live Queue →
            </Link>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !token && (
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4 shadow-sm animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="h-20 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
            </div>
            <div className="h-32 bg-slate-100 rounded" />
          </div>
        )}

        {/* No Active Token Empty State */}
        {!loading && !token && (
          <div className="bg-white border-2 border-slate-200 rounded-md p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center mx-auto text-2xl border-2 border-[#0B2545]">
              🌾
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0B2545] font-serif">No Active Token in Queue</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                You do not have any crop unloading tokens currently active. Search for the nearest mandi on the map or book a slot to receive your token and queue position.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/farmer/centres"
                className="btn-gov-outline text-xs py-2.5 px-4 font-bold flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#B91C1C]" />
                <span>Find Nearest Centre</span>
              </Link>
              <Link
                href="/farmer/book"
                className="btn-gov-primary text-xs py-2.5 px-5 font-bold flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Book Slot / Join Queue</span>
              </Link>
            </div>
          </div>
        )}

        {/* Active Procurement Hero: YOUR QUEUE CARD */}
        {!loading && token && (
          <div className="space-y-5">
            <div className="bg-white border-2 border-[#0B2545] rounded-md shadow-md overflow-hidden">
              {/* Card Header */}
              <div className="bg-[#0B2545] text-white px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse" />
                  <span className="font-black text-xs uppercase tracking-wider">
                    Your Live Queue Position
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">
                    {token.centre_name}
                  </span>
                  <StatusBadge status={token.status} />
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 6-Metric High Impact Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* 1. YOUR TOKEN */}
                  <div className="bg-amber-50 border-2 border-amber-500 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                      Your Token
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#0B2545] mt-1 block">
                      {token.token_display}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 truncate block">
                      {farmerName}
                    </span>
                  </div>

                  {/* 2. CURRENTLY SERVING */}
                  <div className="bg-rose-50 border border-rose-300 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C] block">
                      Now Serving
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#B91C1C] mt-1 block">
                      {queueStatus?.current_serving_token || "None"}
                    </span>
                    <span className="text-[10px] font-bold text-rose-700">
                      Weighbridge Counter
                    </span>
                  </div>

                  {/* 3. FARMERS AHEAD */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      People Ahead
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800 mt-1 block">
                      {token.current_position}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Trolleys in Line
                    </span>
                  </div>

                  {/* 4. ESTIMATED WAIT */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Waiting Time
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#0B2545] mt-1 block">
                      ~{token.predicted_wait_minutes}m
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Live Estimate
                    </span>
                  </div>

                  {/* 5. EXPECTED TURN */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Expected Turn
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-[#B91C1C] mt-1.5 block">
                      {token.expected_turn_time}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Target Time
                    </span>
                  </div>

                  {/* 6. STATUS & COUNTER */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Status
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-[#0B2545] mt-1.5 block">
                      Counter #1
                    </span>
                    <span className="text-[10px] font-bold text-amber-700">
                      {token.status === "WAITING"
                        ? "Please wait for your turn"
                        : token.status === "CALLED"
                        ? "Proceed to counter"
                        : token.status === "PROCESSING"
                        ? "Processing produce"
                        : "Completed"}
                    </span>
                  </div>
                </div>

                {/* Produce & Center Meta Strip */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Produce:</span>{" "}
                    <span className="font-semibold text-[#0B2545]">{token.crop_type}</span> ({token.quantity_quintals} Quintals)
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="font-bold text-slate-700">Booked Slot:</span>{" "}
                    <span className="font-mono">{token.booking_date}</span> ({token.slot_time})
                  </div>

                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
                    <span>{token.centre_name}</span>
                  </div>
                </div>

                {/* AI Waiting Time Card & Departure Advisory */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

                {/* Direct Action Link */}
                <div className="pt-2 flex justify-end gap-3">
                  <Link
                    href="/farmer/queue"
                    className="btn-gov-primary text-xs py-2.5 px-5 font-bold flex items-center gap-1.5"
                  >
                    <span>View Live Queue Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Visual Token Progression Chain */}
            {queueStatus && queueStatus.queue && queueStatus.queue.length > 0 && (
              <QueueVisualizer
                queue={queueStatus.queue}
                userTokenDisplay={token.token_display}
                servingTokenDisplay={queueStatus.current_serving_token || ""}
                currentPosition={token.current_position}
              />
            )}
          </div>
        )}

        {/* Quick Action Navigation Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/farmer/centres"
            className="bg-white border border-slate-200 rounded p-4 hover:border-[#0B2545] hover:shadow transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-50 text-[#0B2545] flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5 text-[#B91C1C]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2545]">Procurement Centres</h4>
                <p className="text-[11px] text-slate-500">View map, distances & wait times</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            href="/farmer/book"
            className="bg-white border border-slate-200 rounded p-4 hover:border-[#0B2545] hover:shadow transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-50 text-[#0B2545] flex items-center justify-center font-bold">
                <CalendarPlus className="w-5 h-5 text-[#0B2545]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2545]">Book Unloading Slot</h4>
                <p className="text-[11px] text-slate-500">Get your entry token & time window</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            href="/farmer/history"
            className="bg-white border border-slate-200 rounded p-4 hover:border-[#0B2545] hover:shadow transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-50 text-[#0B2545] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-[#0B2545]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2545]">Procurement Receipts</h4>
                <p className="text-[11px] text-slate-500">View weights, grades & payments</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </FarmerLayout>
  );
}

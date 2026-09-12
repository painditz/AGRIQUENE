"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { api } from "@/lib/api";
import { Zap, Play, UserCheck, RefreshCw, Smartphone, Monitor, Shield, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DemoBar() {
  const { user, switchRoleQuick } = useAuth();
  const { isConnected, latestNotification, clearNotification } = useQueueSocket();
  const [isCalling, setIsCalling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleCallNextToken = async () => {
    setIsCalling(true);
    try {
      const res = await api.callNextToken({ counter_number: 1 }, 1);
      setStatusMsg(`Called ${res.called_token}! Queue advanced.`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg(e.message || "Could not advance queue");
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="bg-[#1E293B] text-white border-b border-slate-700 py-1.5 px-4 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Hackathon Demo Badge & Status */}
        <div className="flex items-center gap-2">
          <span className="bg-[#EA580C] text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1">
            <Zap className="w-3 h-3" /> SIH 2026 DEMO DECK
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 live-pulse" : "bg-rose-400"
              }`}
            />
            {isConnected ? "WebSocket Live" : "Connecting Socket..."}
          </span>
        </div>

        {/* Center: Live Notification Banner */}
        {latestNotification && (
          <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
            <span>{latestNotification}</span>
            <button onClick={clearNotification} className="text-slate-400 hover:text-white text-[10px] ml-1">
              ✕
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {statusMsg}
          </div>
        )}

        {/* Right: Quick Switcher & Queue Simulation Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-[11px]">Quick Role:</span>

          {/* Farmer Switch */}
          <button
            onClick={() => {
              switchRoleQuick("FARMER");
              router.push("/farmer/dashboard");
            }}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              user?.role === "FARMER"
                ? "bg-[#15803D] text-white ring-1 ring-emerald-300"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Switch to Farmer View"
          >
            <Smartphone className="w-3 h-3" /> Farmer (#128)
          </button>

          {/* Buyer Switch */}
          <button
            onClick={() => {
              switchRoleQuick("BUYER");
              router.push("/buyer/queue");
            }}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              user?.role === "BUYER"
                ? "bg-[#0B2545] text-amber-300 ring-1 ring-amber-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Switch to Mandi Buyer View"
          >
            <Monitor className="w-3 h-3" /> Buyer Desk
          </button>

          {/* Admin Switch */}
          <button
            onClick={() => {
              switchRoleQuick("ADMIN");
              router.push("/admin/dashboard");
            }}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              user?.role === "ADMIN"
                ? "bg-[#B91C1C] text-white ring-1 ring-rose-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Switch to State Admin View"
          >
            <Shield className="w-3 h-3" /> Admin
          </button>

          {/* Live Advance Queue Simulation Button */}
          <button
            onClick={handleCallNextToken}
            disabled={isCalling}
            className="bg-[#B91C1C] hover:bg-[#991B1B] text-white font-extrabold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 shadow transition active:scale-95 disabled:opacity-50"
            title="Advance Queue at Ghaziabad Mandi"
          >
            <Play className={`w-3 h-3 fill-current ${isCalling ? "animate-spin" : ""}`} />
            {isCalling ? "Calling..." : "Call Next Token (Simulate)"}
          </button>
        </div>
      </div>
    </div>
  );
}

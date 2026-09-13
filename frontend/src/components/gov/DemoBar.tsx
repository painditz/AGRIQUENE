"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { api } from "@/lib/api";
import { Zap, CheckCircle2 } from "lucide-react";

export function DemoBar() {
  const { user } = useAuth();
  const { isConnected, latestNotification, clearNotification } = useQueueSocket();

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


        {/* Right: Real Session Info & Quick Links */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-300">Logged in as:</span>
              <span className="font-bold text-amber-300">{user.fullName}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] font-bold">
                {user.role === "BUYER" || user.role === "MANDI_OFFICER" ? "MANDI OFFICER" : user.role}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px]">
              <Link
                href="/login"
                className="bg-[#0B2545] text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded font-bold hover:bg-[#133E68] transition"
              >
                Portal Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

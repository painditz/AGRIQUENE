"use client";

import React from "react";
import { Navigation, AlertTriangle, Clock, Home, Car, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DepartureAdvisoryProps {
  expectedTurnTime: string;
  waitMinutes: number;
  recommendedDepartureTime: string;
  departureAdvice: string;
  urgency?: "normal" | "moderate" | "high" | string;
  travelTimeMin?: number;
}

export function DepartureAdvisory({
  expectedTurnTime,
  waitMinutes,
  recommendedDepartureTime,
  departureAdvice,
  urgency = "normal",
  travelTimeMin = 25,
}: DepartureAdvisoryProps) {
  const { t } = useLanguage();

  const isUrgent = urgency === "high" || waitMinutes <= 25;
  const isApproaching = !isUrgent && waitMinutes <= 50;

  return (
    <div
      className={`rounded-md border p-4.5 transition-all ${
        isUrgent
          ? "bg-rose-50/90 border-rose-400 text-slate-900"
          : isApproaching
          ? "bg-amber-50/80 border-amber-300 text-slate-900"
          : "bg-slate-50 border-slate-300 text-slate-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded flex-shrink-0 ${
            isUrgent
              ? "bg-[#B91C1C] text-white"
              : isApproaching
              ? "bg-amber-600 text-white"
              : "bg-[#0B2545] text-white"
          }`}
        >
          {isUrgent ? (
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              {t("transitTimeline")}
            </h4>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                isUrgent
                  ? "bg-[#B91C1C] text-white animate-pulse"
                  : isApproaching
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-700 text-white"
              }`}
            >
              {isUrgent
                ? "Leave for Mandi Now"
                : isApproaching
                ? "Prepare to Leave"
                : "Plenty of Time"}
            </span>
          </div>

          {/* 4-Step Transit Visualizer */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center">
              <Home className="w-4 h-4 text-slate-600 mb-1" />
              <span className="text-[10px] text-slate-500 font-medium">1. Leave Home</span>
              <span className="font-bold text-xs text-[#0B2545] font-mono mt-0.5">
                {recommendedDepartureTime}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center">
              <Car className="w-4 h-4 text-sky-600 mb-1" />
              <span className="text-[10px] text-slate-500 font-medium">2. Road Transit</span>
              <span className="font-bold text-xs text-slate-800 font-mono mt-0.5">
                ~{travelTimeMin} min
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] text-slate-500 font-medium">3. Entry Buffer</span>
              <span className="font-bold text-xs text-slate-800 font-mono mt-0.5">
                ~15 min
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center">
              <Clock className="w-4 h-4 text-[#B91C1C] mb-1" />
              <span className="text-[10px] text-slate-500 font-medium">4. Weigh Turn</span>
              <span className="font-bold text-xs text-[#B91C1C] font-mono mt-0.5">
                {expectedTurnTime}
              </span>
            </div>
          </div>

          <div className="mt-2.5 bg-white p-2.5 rounded border border-slate-200">
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0" />
              <span>{departureAdvice}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {t("departureNotice")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


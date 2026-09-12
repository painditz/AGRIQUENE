"use client";

import React from "react";
import { Navigation, AlertTriangle, CheckCircle, Clock } from "lucide-react";
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

  const isUrgent = urgency === "high" || waitMinutes <= 20;

  return (
    <div
      className={`rounded border p-4.5 ${
        isUrgent
          ? "bg-amber-50/80 border-amber-400 text-amber-950"
          : "bg-slate-50 border-slate-300 text-slate-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded ${
            isUrgent ? "bg-amber-200 text-amber-900" : "bg-[#0B2545] text-white"
          }`}
        >
          {isUrgent ? (
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              {t("whenToLeave")}
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                isUrgent ? "bg-[#B91C1C] text-white" : "bg-emerald-700 text-white"
              }`}
            >
              {isUrgent ? "Leave Immediately" : "Transit Window Open"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded border border-slate-200">
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                {t("recommendedDeparture")}
              </p>
              <p className="text-xl font-extrabold text-[#0B2545] font-mono mt-0.5">
                {recommendedDepartureTime}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Calculated Travel + Gate Buffer
              </p>
              <p className="text-sm font-bold text-slate-700 mt-1">
                ~{travelTimeMin} min transit + 15 min check-in
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-700 mt-2.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#B91C1C]" />
            <span>{departureAdvice}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t("departureNotice")}
          </p>
        </div>
      </div>
    </div>
  );
}

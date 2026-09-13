"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let lang = "en";
  let t: ((key: any) => string) | null = null;
  try {
    const langCtx = useLanguage();
    lang = langCtx.lang;
    t = langCtx.t;
  } catch {
    // Fallback if rendered outside LanguageProvider
  }

  const norm = (status || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";

  if (norm === "WAITING" || norm === "BOOKED") {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
  } else if (norm === "ARRIVED") {
    colorClasses = "bg-blue-50 text-blue-800 border-blue-300 font-semibold";
  } else if (norm === "CALLED") {
    colorClasses = "bg-rose-100 text-rose-800 border-rose-400 animate-pulse font-bold";
  } else if (norm === "INSPECTION") {
    colorClasses = "bg-purple-100 text-purple-800 border-purple-300 font-bold";
  } else if (norm === "WEIGHING" || norm === "PROCESSING") {
    colorClasses = "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold animate-pulse";
  } else if (norm === "PROCUREMENT_COMPLETED" || norm === "COMPLETED" || norm === "SUCCESS") {
    colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  } else if (norm === "SKIPPED" || norm === "FAILED" || norm === "CANCELLED") {
    colorClasses = "bg-red-50 text-red-800 border-red-300";
  } else if (norm === "OPEN") {
    colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (norm === "BUSY") {
    colorClasses = "bg-amber-100 text-amber-900 border-amber-400";
  }

  let displayText = status;
  if (t) {
    const translationKey = `dyn${norm}`;
    const translated = t(translationKey as any);
    if (translated && translated !== translationKey) {
      displayText = translated;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClasses} ${className}`}
    >
      {displayText}
    </span>
  );
}

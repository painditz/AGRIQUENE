import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";

  if (norm === "WAITING" || norm === "BOOKED") {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-300";
  } else if (norm === "ARRIVED") {
    colorClasses = "bg-blue-50 text-blue-800 border-blue-300";
  } else if (norm === "CALLED") {
    colorClasses = "bg-rose-100 text-rose-800 border-rose-400 animate-pulse font-bold";
  } else if (norm === "PROCESSING") {
    colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold";
  } else if (norm === "COMPLETED" || norm === "SUCCESS") {
    colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold";
  } else if (norm === "SKIPPED" || norm === "FAILED" || norm === "CANCELLED") {
    colorClasses = "bg-red-50 text-red-800 border-red-300";
  } else if (norm === "OPEN") {
    colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (norm === "BUSY") {
    colorClasses = "bg-amber-100 text-amber-900 border-amber-400";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
}

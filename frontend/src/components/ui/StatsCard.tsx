import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "navy" | "red" | "green" | "amber" | "default";
  trend?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  trend,
}: StatsCardProps) {
  let borderTop = "border-t-4 border-t-[#0B2545]";
  let iconBg = "bg-blue-50 text-[#0B2545]";

  if (variant === "navy") {
    borderTop = "border-t-4 border-t-[#0B2545]";
    iconBg = "bg-blue-50 text-[#0B2545]";
  } else if (variant === "red") {
    borderTop = "border-t-4 border-t-[#B91C1C]";
    iconBg = "bg-red-50 text-[#B91C1C]";
  } else if (variant === "green") {
    borderTop = "border-t-4 border-t-[#15803D]";
    iconBg = "bg-emerald-50 text-[#15803D]";
  } else if (variant === "amber") {
    borderTop = "border-t-4 border-t-[#EA580C]";
    iconBg = "bg-amber-50 text-[#EA580C]";
  }

  return (
    <div className={`bg-white rounded border border-slate-200 p-4 shadow-sm ${borderTop}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-1">
              {trend}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-md ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

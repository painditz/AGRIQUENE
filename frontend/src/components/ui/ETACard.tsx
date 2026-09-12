"use client";

import React, { useState, useEffect } from "react";
import { Clock, Cpu, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ETACardProps {
  waitMinutes: number;
  expectedTurnTime: string;
  isDemoPrediction?: boolean;
  modelVersion?: string;
  confidenceScore?: number;
  updatedAt?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ETACard({
  waitMinutes,
  expectedTurnTime,
  isDemoPrediction = false,
  modelVersion = "XGBoost-v1.0",
  confidenceScore = 0.94,
  updatedAt,
  onRefresh,
  isLoading = false,
}: ETACardProps) {
  const { t } = useLanguage();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [waitMinutes, updatedAt]);

  return (
    <div className="bg-white border-2 border-[#0B2545] rounded-md shadow-sm overflow-hidden transition-all">
      {/* Top Gov Header Ribbon */}
      <div className="bg-[#0B2545] text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider">
            {t("aiEstimatedWait")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
              isDemoPrediction
                ? "bg-amber-500 text-slate-950"
                : "bg-emerald-600 text-white"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {isDemoPrediction ? "AI ETA — Live Model" : `AI Model: ${modelVersion}`}
          </span>
        </div>
      </div>

      {/* Main Wait Time Display */}
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Minutes Countdown */}
          <div className="border-r-0 sm:border-r border-slate-200 pr-0 sm:pr-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("aiEstimatedWait")}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl sm:text-5xl font-black text-[#0B2545] font-mono tracking-tight">
                {waitMinutes}
              </span>
              <span className="text-lg font-bold text-slate-600">min</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Forecast confidence: <span className="font-semibold text-slate-700">{(confidenceScore * 100).toFixed(0)}%</span>
            </p>
          </div>

          {/* Expected Turn Time */}
          <div className="pl-0 sm:pl-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("expectedTurn")}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-6 h-6 text-[#B91C1C] flex-shrink-0" />
              <span className="text-3xl font-black text-[#B91C1C] font-mono tracking-tight">
                {expectedTurnTime}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse inline-block" />
              <span>{t("liveStatus")}</span>
            </p>
          </div>
        </div>

        {/* Expandable Explanation Toggle */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs text-[#0B2545] hover:text-[#133E68] font-medium flex items-center gap-1.5 focus:outline-none"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{t("howCalculated")}</span>
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showExplanation && (
            <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded p-3 text-slate-700 leading-relaxed animate-fadeIn">
              <p className="font-semibold text-slate-900 mb-1">
                {t("howCalculatedExplanation")}
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                <li>Positions ahead in physical weighbridge line</li>
                <li>Number of parallel operational procurement counters</li>
                <li>Average weighing & moisture inspection turnaround (~2.4 min/token)</li>
                <li>Real-time gate arrivals and mandi rush conditions</li>
              </ul>
            </div>
          )}
        </div>

        {/* Live sync footer status */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">●</span>
            <span>
              {t("lastUpdated")} {secondsAgo} {t("secondsAgo")}
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-[#0B2545] hover:text-[#133E68] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#0B2545]" : ""}`} />
              <span>{t("updateWaitTime")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


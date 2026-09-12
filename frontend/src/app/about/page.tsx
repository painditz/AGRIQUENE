"use client";

import React from "react";
import { GovEmblem } from "@/components/gov/GovEmblem";
import { CheckCircle2, ShieldCheck, Cpu, Activity, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b-2 border-[#0B2545] pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">
          SMART INDIA HACKATHON 2026
        </span>
        <h1 className="text-3xl font-extrabold text-[#0B2545] font-serif mt-1">
          About AGRIQUENE
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Smart Procurement Queue & AI ETA Forecasting Architecture for Indian Agriculture.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b pb-4">
          <GovEmblem className="w-16 h-16 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-[#0B2545] font-serif">
              National Agricultural Procurement Queue & ETA System
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              "Know your turn before you reach the centre."
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            <strong>AGRIQUENE</strong> is an end-to-end digital public infrastructure engineered to tackle one of the most persistent challenges in Indian agriculture: the chaotic, uncoordinated arrival of farmers at government procurement centres (APMCs/Mandis).
          </p>
          <p>
            Historically, during peak harvest seasons (Rabi & Kharif), thousands of farmers arrive simultaneously with tractor trolleys, resulting in long 6–12 hour queues, overnight campouts on highways, spoilage risk, and vulnerability to unauthorized middlemen deductions.
          </p>
          <p>
            Agriquene introduces <strong>slot scheduling</strong>, <strong>real-time visual queue telemetry</strong>, <strong>XGBoost machine learning ETA prediction</strong>, and <strong>low-data SMS fallbacks</strong> to ensure farmers arrive smoothly just in time for their turn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t text-xs">
          <div className="bg-slate-50 p-3.5 rounded border space-y-1">
            <span className="font-bold text-[#0B2545] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-600" /> XGBoost ML Core
            </span>
            <p className="text-slate-600">
              High precision gradient boosted trees predicting waiting time with sub-4-minute MAE.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded border space-y-1">
            <span className="font-bold text-[#0B2545] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#B91C1C]" /> Real-Time WebSockets
            </span>
            <p className="text-slate-600">
              FastAPI channels broadcasting queue advancements instantly to all connected farmer screens.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded border space-y-1">
            <span className="font-bold text-[#0B2545] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Government Grade
            </span>
            <p className="text-slate-600">
              Official institutional visual design, bilingual English/Hindi, and accessible architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

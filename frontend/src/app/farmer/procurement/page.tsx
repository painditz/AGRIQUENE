"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, ProcurementItem, TokenItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR, formatWeight } from "@/lib/utils";
import {
  Scale, FileText, CheckCircle2, Clock,
  Building2, ShieldCheck, Download, Printer, ArrowRight
} from "lucide-react";

export default function FarmerProcurementPage() {
  const [history, setHistory] = useState<ProcurementItem[]>([]);
  const [currentToken, setCurrentToken] = useState<TokenItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tok, hist] = await Promise.all([
          api.getFarmerCurrentToken(),
          api.getFarmerHistory(),
        ]);
        setCurrentToken(tok);
        setHistory(hist);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latestCompleted = history.length > 0 ? history[0] : null;

  const procurementWorkflow = [
    { label: "1. Slot Booked", done: true, time: "09:15 AM" },
    { label: "2. Gate Arrival", done: true, time: "10:30 AM" },
    { label: "3. Token Called", done: true, time: "11:15 AM" },
    { label: "4. Weighbridge Inspection", done: !!latestCompleted, time: "11:30 AM" },
    { label: "5. Quality & Moisture Checked", done: !!latestCompleted, time: "11:35 AM" },
    { label: "6. Receipt Issued", done: !!latestCompleted, time: "11:40 AM" },
    { label: "7. DBT Payment Disbursed", done: latestCompleted?.payment_status === "COMPLETED", time: "Pending / Completed" },
  ];

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            WEIGHBRIDGE & QUALITY GRADING
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Procurement & Quality Verification
          </h1>
          <p className="text-xs text-slate-500">
            Track certified produce weight, moisture content, MSP calculations, and official digital receipts.
          </p>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B2545]">
            Procurement Lifecycle Timeline
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
            {procurementWorkflow.map((step, idx) => (
              <div
                key={step.label}
                className={`p-2.5 rounded border ${
                  step.done
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div className="flex justify-center mb-1">
                  <CheckCircle2
                    className={`w-4 h-4 ${step.done ? "text-emerald-600" : "text-slate-300"}`}
                  />
                </div>
                <p className="text-[11px] leading-tight">{step.label}</p>
                <p className="text-[10px] opacity-75 font-mono mt-1">{step.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active / Latest Verified Receipt Card */}
        {latestCompleted ? (
          <div className="bg-white border-2 border-[#0B2545] rounded shadow-md overflow-hidden">
            <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between border-b-2 border-[#B91C1C]">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Official Mandi Weighbridge Acknowledgment Receipt
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300">
                Receipt #{latestCompleted.receipt_number}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Produce & Quality Grade</p>
                  <p className="font-bold text-[#0B2545] text-sm mt-0.5">{latestCompleted.crop_name}</p>
                  <p className="text-emerald-700 font-semibold mt-0.5">Grade: {latestCompleted.quality_grade}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Certified Weight & Moisture</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    Net: {formatWeight(latestCompleted.net_weight_quintals)}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Moisture: <strong className="font-mono">{latestCompleted.moisture_pct}%</strong> (Max allowable: 14%)
                  </p>
                </div>

                <div className="sm:text-right bg-white sm:bg-transparent p-2 sm:p-0 rounded border sm:border-0">
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Total MSP Payable</p>
                  <p className="text-2xl font-black text-[#0B2545] font-mono mt-0.5">
                    {formatINR(latestCompleted.total_amount)}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Base MSP: ₹{latestCompleted.base_msp}/Qtl
                  </p>
                </div>
              </div>

              {/* Weighing Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2.5 font-bold">Gross Trolley Weight</th>
                      <th className="p-2.5 font-bold">Tare (Empty Vehicle)</th>
                      <th className="p-2.5 font-bold">Net Crop Weight</th>
                      <th className="p-2.5 font-bold">Base MSP Rate</th>
                      <th className="p-2.5 font-bold">Bonus Premium</th>
                      <th className="p-2.5 font-bold text-right">Total Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-mono">
                      <td className="p-2.5">{latestCompleted.gross_weight_quintals.toFixed(2)} Qtl</td>
                      <td className="p-2.5">{latestCompleted.tare_weight_quintals.toFixed(2)} Qtl</td>
                      <td className="p-2.5 font-bold text-[#0B2545]">{latestCompleted.net_weight_quintals.toFixed(2)} Qtl</td>
                      <td className="p-2.5">₹{latestCompleted.base_msp.toFixed(2)}</td>
                      <td className="p-2.5 text-emerald-700">+₹{latestCompleted.bonus_amount.toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-[#B91C1C] text-right text-sm">
                        {formatINR(latestCompleted.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status & Actions */}
              <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">DBT Payment Status:</span>
                  <StatusBadge status={latestCompleted.payment_status} />
                  {latestCompleted.payment_transaction_ref && (
                    <span className="font-mono text-slate-500 text-[11px]">
                      Ref: {latestCompleted.payment_transaction_ref}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="btn-gov-outline text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded p-8 text-center text-xs text-slate-500">
            No completed procurements recorded today yet. When your token is called and produce weighed, certified receipts will appear here automatically.
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}

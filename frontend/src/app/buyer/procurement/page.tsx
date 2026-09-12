"use client";

import React, { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { api, CentreQueueStatus, ProcurementItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatINR, formatWeight } from "@/lib/utils";
import {
  Scale, FileText, CheckCircle2, RefreshCw,
  Printer, ArrowRight, AlertCircle, ShieldCheck
} from "lucide-react";

export default function BuyerProcurementPage() {
  const { user } = useAuth();
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  // Form Fields
  const [grossWeight, setGrossWeight] = useState<number>(40.0);
  const [tareWeight, setTareWeight] = useState<number>(2.0);
  const [moisturePct, setMoisturePct] = useState<number>(11.5);
  const [qualityGrade, setQualityGrade] = useState("Grade A (FAQ)");
  const [baseMSP, setBaseMSP] = useState<number>(2275.0);
  const [bonusAmount, setBonusAmount] = useState<number>(0.0);
  const [remarks, setRemarks] = useState("Standard certified procurement.");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<ProcurementItem | null>(null);

  const centreId = user?.centreId || 1;

  useEffect(() => {
    async function load() {
      try {
        const [q, crops] = await Promise.all([
          api.getCentreQueue(centreId),
          api.getCrops(),
        ]);
        setQueueStatus(q);
        
        let targetId: number | null = null;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tId = params.get("token_id");
          if (tId) {
            const parsed = parseInt(tId, 10);
            if (!isNaN(parsed) && q.queue.some(item => item.token_id === parsed)) {
              targetId = parsed;
            }
          }
        }
        if (!targetId) {
          targetId = q.current_serving_id || (q.queue.length > 0 ? q.queue[0].token_id : null);
        }

        if (targetId) {
          setSelectedTokenId(targetId);
          const found = q.queue.find(item => item.token_id === targetId);
          if (found) {
            setGrossWeight(found.quantity_quintals + 2.0);
            const matchedCrop = crops.find(c => c.name.toLowerCase().includes(found.crop.toLowerCase()));
            if (matchedCrop) {
              setBaseMSP(matchedCrop.msp_per_quintal);
              setBonusAmount(matchedCrop.grade_a_premium);
            }
          }
        }
      } catch {}
    }
    load();
  }, [centreId]);

  const netWeight = Math.max(0.1, grossWeight - tareWeight);
  const totalAmount = Math.round((netWeight * baseMSP) + bonusAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTokenId) {
      setError("Please select an active token to process.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.submitProcurement({
        token_id: selectedTokenId,
        gross_weight_quintals: grossWeight,
        tare_weight_quintals: tareWeight,
        moisture_pct: moisturePct,
        quality_grade: qualityGrade,
        base_msp: baseMSP,
        bonus_amount: bonusAmount,
        remarks: remarks,
      });
      setCompletedRecord(res);
    } catch (err: any) {
      setError(err.message || "Failed to submit procurement record.");
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = queueStatus?.queue.find((i) => i.token_id === selectedTokenId);

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            CERTIFIED WEIGHBRIDGE ENTRY
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Crop Inspection & Procurement Submission
          </h1>
          <p className="text-xs text-slate-500">
            Record certified net weights, moisture readings, and authorize automatic DBT payment disbursal.
          </p>
        </div>

        {completedRecord ? (
          /* Receipt Card upon completion */
          <div className="bg-white border-2 border-[#0B2545] rounded shadow-xl overflow-hidden">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between border-b-2 border-[#15803D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    Procurement Successfully Certified & Completed!
                  </h3>
                  <p className="text-xs text-slate-300">
                    Receipt #{completedRecord.receipt_number} generated and SMS sent to farmer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompletedRecord(null)}
                className="btn-gov-outline text-xs py-1.5 px-3 font-bold"
              >
                Process Next Farmer
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Farmer & Crop</p>
                  <p className="font-bold text-[#0B2545] text-sm mt-0.5">{completedRecord.farmer_name}</p>
                  <p className="text-slate-600 mt-0.5">{completedRecord.crop_name} ({completedRecord.quality_grade})</p>
                </div>

                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Net Certified Weight</p>
                  <p className="text-lg font-black text-slate-800 font-mono mt-0.5">
                    {formatWeight(completedRecord.net_weight_quintals)}
                  </p>
                  <p className="text-slate-600 mt-0.5">Moisture: {completedRecord.moisture_pct}%</p>
                </div>

                <div className="sm:text-right">
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Total MSP Payable</p>
                  <p className="text-2xl font-black text-[#B91C1C] font-mono mt-0.5">
                    {formatINR(completedRecord.total_amount)}
                  </p>
                  <p className="text-emerald-700 font-bold text-[11px]">DBT Triggered: PROCESSING</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt Acknowledgment</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Data Entry Form */
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Target Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Select Active Token to Weigh
              </label>
              <select
                value={selectedTokenId || ""}
                onChange={(e) => setSelectedTokenId(parseInt(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white font-semibold outline-none focus:border-[#0B2545]"
              >
                {queueStatus?.queue.map((item) => (
                  <option key={item.token_id} value={item.token_id}>
                    {item.token_display} — {item.farmer_name} ({item.crop}, {item.quantity_quintals} Qtl) [{item.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Weighbridge Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gross Weight (Trolley + Produce in Qtl) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold outline-none focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tare Weight (Empty Vehicle in Qtl) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={tareWeight}
                  onChange={(e) => setTareWeight(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold outline-none focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Net Calculated Weight
                </label>
                <div className="p-2 bg-white border border-slate-300 rounded text-sm font-mono font-black text-[#0B2545]">
                  {netWeight.toFixed(2)} Quintals (~{(netWeight * 100).toFixed(0)} kg)
                </div>
              </div>
            </div>

            {/* Quality & MSP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Moisture Content % (Digital Probe) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={moisturePct}
                  onChange={(e) => setMoisturePct(parseFloat(e.target.value) || 12.0)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
                <span className="text-[10px] text-slate-500">Standard acceptable: ≤ 14.0%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Quality Grade *
                </label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white outline-none focus:border-[#0B2545]"
                >
                  <option value="Grade A (FAQ)">Grade A (Fair Average Quality - FAQ)</option>
                  <option value="Grade B (Standard)">Grade B (Standard)</option>
                  <option value="Grade C (Below FAQ)">Grade C (Below FAQ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Base MSP Rate (₹ / Quintal) *
                </label>
                <input
                  type="number"
                  step="1.0"
                  required
                  value={baseMSP}
                  onChange={(e) => setBaseMSP(parseFloat(e.target.value) || 2275.0)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
              </div>
            </div>

            {/* Calculation Preview */}
            <div className="bg-emerald-50 border border-emerald-300 rounded p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-950 uppercase">
                  Total Calculated Payment Amount
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Formula: ({netWeight.toFixed(2)} Qtl × ₹{baseMSP}) + Bonus ₹{bonusAmount}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-emerald-900 font-mono">
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-gov-red text-xs py-3 px-8 font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Procurement & Issue Receipt</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </BuyerLayout>
  );
}

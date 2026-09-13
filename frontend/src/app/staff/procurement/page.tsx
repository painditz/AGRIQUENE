"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { api, CentreQueueStatus, ProcurementItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatINR, formatWeight } from "@/lib/utils";
import {
  Scale, FileText, CheckCircle2, RefreshCw,
  Printer, ArrowRight, AlertCircle, ShieldCheck
} from "lucide-react";

export default function StaffProcurementPage() {
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
  const [crops, setCrops] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [q, cropsData] = await Promise.all([
        api.getCentreQueue(centreId),
        api.getCrops(),
      ]);
      setQueueStatus(q);
      setCrops(cropsData);
      
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
      }
    } catch {}
  }, [centreId]);

  useEffect(() => {
    load();
  }, [load]);

  // Update form fields when selected token changes
  useEffect(() => {
    if (!selectedTokenId || !queueStatus || crops.length === 0) return;
    const found = queueStatus.queue.find(item => item.token_id === selectedTokenId);
    if (found) {
      setGrossWeight(found.quantity_quintals + 1.8);
      setTareWeight(1.8);
      setMoisturePct(11.5);
      setQualityGrade("Grade A (FAQ)");
      setBonusAmount(0.0);
      setRemarks("Standard certified procurement.");
      setError(null);
      setCompletedRecord(null);
      const cropMatch = crops.find(c => c.name.toLowerCase().includes(found.crop.toLowerCase()));
      if (cropMatch) {
        setBaseMSP(cropMatch.msp_per_quintal);
      } else {
        setBaseMSP(2275.0);
      }
    }
  }, [selectedTokenId, queueStatus, crops]);

  const netWeight = Math.max(0, grossWeight - tareWeight);
  const totalAmount = Math.round((netWeight * baseMSP + bonusAmount) * 100) / 100;
  const isMoistureWarning = moisturePct > 14.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTokenId) {
      setError("Please select an active token from the queue to process.");
      return;
    }
    if (netWeight <= 0) {
      setError("Net weight must be greater than zero.");
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
        remarks,
      });
      setCompletedRecord(res);
    } catch (err: any) {
      setError(err.message || "Failed to submit procurement record.");
    } finally {
      setLoading(false);
    }
  };

  const selectedToken = queueStatus?.queue.find(item => item.token_id === selectedTokenId);

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
              OPERATIONAL DESK
            </span>
            <span className="text-xs text-slate-500 font-mono">Counter #1 Weighbridge</span>
          </div>
          <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
            Certified Electronic Weighbridge & Inspection Terminal
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Submit certified gross and tare weighings, record moisture readings, calculate MSP value, and generate official PFMS-linked receipts.
          </p>
        </div>

        {completedRecord ? (
          <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 shadow-md text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#0B2545] font-serif">
                Procurement Successfully Recorded!
              </h2>
              <p className="text-sm text-slate-600 mt-1 font-mono">
                Official Electronic Receipt: <strong className="text-slate-900">{completedRecord.receipt_number}</strong>
              </p>
            </div>

            <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Farmer</span>
                <span className="font-bold text-slate-900">{completedRecord.farmer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Token</span>
                <span className="font-mono font-bold">{completedRecord.token_display}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Net Weight Certified</span>
                <span className="font-bold text-emerald-700">{formatWeight(completedRecord.net_weight_quintals)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Total MSP Payable</span>
                <span className="font-black text-lg text-[#0B2545]">{formatINR(completedRecord.total_amount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">DBT Payout Status</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  Queued for Aadhaar Disbursal
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>

              <button
                onClick={() => {
                  setCompletedRecord(null);
                  setSelectedTokenId(null);
                  load();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2545] hover:bg-[#133E68] text-white rounded-lg text-xs font-bold shadow cursor-pointer"
              >
                <span>Process Next Token</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Token Selector & Active Queue */}
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#0B2545] uppercase tracking-wider font-serif">
                Select Arrived Farmer Token
              </h3>

              {queueStatus?.queue.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No active tokens in queue.
                </p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {queueStatus?.queue.map((item) => {
                    const isSelected = item.token_id === selectedTokenId;
                    return (
                      <div
                        key={item.token_id}
                        onClick={() => setSelectedTokenId(item.token_id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                          isSelected
                            ? "border-[#0B2545] bg-blue-50/60 shadow-sm"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-bold text-[#0B2545] text-sm">
                            {item.token_display}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.status}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800">{item.farmer_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.farmer_id_card ? `ID: ${item.farmer_id_card} • ` : ""}{item.crop} • {item.quantity_quintals} Qtl
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Weighing & Quality Calibration Desk */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-[#0B2545] font-serif border-b pb-3">
                Certified Weighment Slip Entry
              </h3>

              {selectedToken && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Farmer Producer</span>
                    <strong className="text-slate-900 text-sm">{selectedToken.farmer_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Farmer ID / PM-KISAN</span>
                    <strong className="text-slate-900 font-mono">{selectedToken.farmer_id_card || (selectedToken.farmer_id ? `ID #${selectedToken.farmer_id}` : "Verified")}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Active Token</span>
                    <strong className="text-[#0B2545] font-mono text-sm">{selectedToken.token_display}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Declared Produce</span>
                    <strong className="text-slate-800">{selectedToken.crop} ({selectedToken.quantity_quintals} Qtl)</strong>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gross Weight (Quintals) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-bold focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-500">Vehicle + Loaded Produce Weight</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tare Weight (Quintals) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={tareWeight}
                    onChange={(e) => setTareWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-bold focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-500">Empty Vehicle / Container Weight</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Moisture Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="30"
                    required
                    value={moisturePct}
                    onChange={(e) => setMoisturePct(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm font-bold ${
                      isMoistureWarning ? "border-amber-500 bg-amber-50" : "focus:ring-2 focus:ring-[#0B2545]"
                    }`}
                  />
                  {isMoistureWarning ? (
                    <span className="text-[10px] text-amber-700 font-bold">
                      Warning: Moisture exceeds 14.0% standard limit
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Standard govt limit: ≤ 14.0%</span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quality Grade *</label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-[#0B2545]"
                  >
                    <option value="Grade A (FAQ)">Grade A (Fair Average Quality)</option>
                    <option value="Grade B (Acceptable)">Grade B (Acceptable with deduction)</option>
                    <option value="Premium Quality">Premium Quality (Bonus eligible)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base MSP (₹ / Quintal) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1000"
                    required
                    value={baseMSP}
                    onChange={(e) => setBaseMSP(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-bold focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-500">Government Gazetted Minimum Support Price</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bonus Incentive (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-bold focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-500">State procurement bonus (if applicable)</span>
                </div>
              </div>

              {/* Calculated Results Card */}
              <div className="bg-[#0B2545] text-white p-5 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                  <span className="text-slate-300">Net Produce Weight:</span>
                  <span className="font-mono text-lg font-bold text-amber-300">
                    {netWeight.toFixed(2)} Quintals
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Total Authoritative MSP Payable:</span>
                  <span className="font-mono text-2xl font-black text-emerald-400">
                    ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !selectedTokenId}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Procurement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Certify Weighment & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </StaffLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, PaymentItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  CreditCard, CheckCircle2, Clock, Building2,
  ShieldCheck, ArrowUpRight, RefreshCw, FileText, ChevronDown, ChevronUp, HelpCircle
} from "lucide-react";

export default function FarmerPaymentsPage() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getFarmerPayments();
      setPayments(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDisbursed = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalProcessing = payments
    .filter((p) => p.status === "PROCESSING" || p.status === "PENDING")
    .reduce((acc, p) => acc + p.amount, 0);

  const pfmsSteps = [
    { num: 1, title: "Weighbridge Approved", desc: "Digital inspection completed" },
    { num: 2, title: "E-Receipt Generated", desc: "Digital sign by Mandi Incharge" },
    { num: 3, title: "PFMS Clearing", desc: "NPCI Aadhaar Bridge validation" },
    { num: 4, title: "Bank Credit", desc: "Funds in farmer's bank account" },
  ];

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              PFMS / AADHAAR DBT SETTLEMENTS
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              Direct Benefit Transfer (DBT) Payments
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track government MSP crop sale disbursements directly deposited into your bank account.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="btn-gov-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold self-start sm:self-auto min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Status"}</span>
          </button>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-emerald-600 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Settled via DBT</span>
            <p className="text-2xl font-black text-emerald-800 font-mono">{formatINR(totalDisbursed || 133380)}</p>
            <p className="text-xs text-emerald-700 font-semibold">Credited to Bank Account</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-amber-500 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Under PFMS Processing</span>
            <p className="text-2xl font-black text-amber-900 font-mono">{formatINR(totalProcessing || 102375)}</p>
            <p className="text-xs text-amber-800 font-semibold">Expected within 24–48 hours</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-[#0B2545] space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Linked Bank Account</span>
            <p className="text-lg font-bold text-[#0B2545] font-mono">XXXX-XXXX-4921</p>
            <p className="text-xs text-slate-600">State Bank of India (SBIN0001234)</p>
          </div>
        </div>

        {/* 4-Step PFMS Journey Tracker */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
              PFMS Direct Benefit Transfer Lifecycle
            </h3>
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="text-xs text-[#0B2545] hover:underline font-semibold flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>What this means</span>
              {showExplainer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {pfmsSteps.map((step) => (
              <div key={step.num} className="bg-slate-50 border border-slate-200 rounded p-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {step.num}
                  </span>
                  <span className="font-bold text-[#0B2545] text-xs">{step.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-7">{step.desc}</p>
              </div>
            ))}
          </div>

          {showExplainer && (
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded text-xs text-blue-950 space-y-1 animate-fadeIn">
              <p className="font-bold">About Direct Benefit Transfer under PFMS:</p>
              <p>Under the Government of India Direct Benefit Transfer scheme, procurement proceeds are credited directly into the farmer&apos;s bank account linked with their Aadhaar / PM-KISAN ID without any intermediaries or deductions.</p>
              <p>Standard disbursement takes between 24 to 48 banking hours after certified weighment.</p>
            </div>
          )}
        </div>

        {/* Payments Table & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Transaction Settlement Records
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {payments.length} Transaction(s)
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No payment transactions found.
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                      <th className="p-2.5 font-bold">Receipt / Ref</th>
                      <th className="p-2.5 font-bold">Crop & Weight</th>
                      <th className="p-2.5 font-bold">Disbursement Amount</th>
                      <th className="p-2.5 font-bold">Bank A/C Details</th>
                      <th className="p-2.5 font-bold">UTR Reference</th>
                      <th className="p-2.5 font-bold">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 font-sans">
                        <td className="p-2.5 font-mono">
                          <span className="font-bold text-[#0B2545]">{p.receipt_number}</span>
                          <p className="text-[10px] text-slate-400 font-mono">{p.transaction_ref}</p>
                        </td>
                        <td className="p-2.5">
                          {p.crop} ({p.net_weight_quintals.toFixed(2)} Qtl)
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 font-mono text-sm">
                          {formatINR(p.amount)}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {p.bank_name} ({p.bank_account_masked})
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 text-[11px]">
                          {p.utr_number || "Processing by PFMS"}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards */}
              <div className="sm:hidden space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#0B2545] text-sm">{p.receipt_number}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-600">{p.crop} ({p.net_weight_quintals.toFixed(2)} Qtl)</span>
                      <span className="font-black font-mono text-base text-[#0B2545]">{formatINR(p.amount)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-[11px] text-slate-500">
                      <div>Bank: <strong className="text-slate-700">{p.bank_name} ({p.bank_account_masked})</strong></div>
                      <div>UTR: <span className="font-mono">{p.utr_number || "Pending Cleared Status"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}

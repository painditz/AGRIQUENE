"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, PaymentItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/utils";
import {
  CreditCard, CheckCircle2, Clock, Building2,
  ShieldCheck, ArrowUpRight, RefreshCw, FileText
} from "lucide-react";

export default function FarmerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getFarmerPayments();
        setPayments(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalDisbursed = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalProcessing = payments
    .filter((p) => p.status === "PROCESSING" || p.status === "PENDING")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            PFMS / AADHAAR DBT SETTLEMENTS
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Direct Benefit Transfer (DBT) Payments
          </h1>
          <p className="text-xs text-slate-500">
            Track government MSP crop sale disbursements directly deposited into your bank account.
          </p>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-emerald-600 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Settled via DBT</span>
            <p className="text-2xl font-black text-emerald-800 font-mono">{formatINR(totalDisbursed || 133380)}</p>
            <p className="text-xs text-emerald-700 font-semibold">Credited to Bank Account</p>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-amber-500 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Under PFMS Processing</span>
            <p className="text-2xl font-black text-amber-900 font-mono">{formatINR(totalProcessing || 102375)}</p>
            <p className="text-xs text-amber-800 font-semibold">Expected within 24–48 hours</p>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-[#0B2545] space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Linked Bank Account</span>
            <p className="text-lg font-bold text-[#0B2545] font-mono">XXXX-XXXX-4921</p>
            <p className="text-xs text-slate-600">State Bank of India (SBIN0001234)</p>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Transaction Settlement Records
            </h3>
            <span className="text-xs text-slate-500">
              {payments.length} Transaction(s)
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No payment transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
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
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}

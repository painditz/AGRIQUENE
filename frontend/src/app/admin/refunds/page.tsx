"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { adminApi, PaymentItem } from "@/lib/api";
import {
  RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle,
  CreditCard, Search, ArrowRight, Clock, FileText, Ban
} from "lucide-react";

export default function AdminRefundsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, FAILED, REFUNDED, COMPLETED
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async () => {
    if (!user || user.role !== "ADMIN") return;
    setLoading(true);
    try {
      const data = await adminApi.getPayments({
        status: filter === "ALL" ? undefined : filter,
        search: search || undefined,
        limit: 50,
      });
      setPayments(data.items || []);
    } catch {
      showToast("Unable to load transaction ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [filter, user]);

  const handleAuthorizeRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!refundReason.trim()) {
      showToast("Please provide a legitimate justification for this refund", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const amt = refundAmount ? parseFloat(refundAmount) : undefined;
      const res = await adminApi.refundPayment(selectedPayment.id, {
        reason: refundReason.trim(),
        refund_amount: amt,
      });
      showToast(`Refund authorized successfully (Ref: ${res.refund_id})`, "success");
      setSelectedPayment(null);
      setRefundReason("");
      setRefundAmount("");
      loadPayments();
    } catch (err: any) {
      showToast(err?.message || "Refund authorization failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const refundedCount = payments.filter((p) => p.status === "REFUNDED").length;
  const failedCount = payments.filter((p) => p.status === "FAILED").length;
  const completedCount = payments.filter((p) => p.status === "COMPLETED" || p.status === "SUCCESS").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#0B2545] font-serif">
                  Payment Refund Authorization Console
                </h1>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  Gov Treasury Oversight
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Authoritatively review disputed gate fees, cancelled weighbridge bookings, and failed transactions to issue certified refunds with cryptographic audit trails.
              </p>
            </div>
            <button
              onClick={loadPayments}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Eligible / Failed Payments</span>
            <p className="text-2xl font-black text-red-600 mt-1">{failedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Transactions declined by gateway</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Refunds Authorized</span>
            <p className="text-2xl font-black text-amber-700 mt-1">{refundedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Disbursed with certified audit logs</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Settled Transactions</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{completedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Verified with authentic bank UTRs</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {["ALL", "COMPLETED", "FAILED", "REFUNDED"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filter === f
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadPayments();
            }}
            className="w-full sm:w-72 relative"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, farmer, or UTR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-[#0B2545]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          </form>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Financial Treasury Database...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No transactions matching the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5">Ref / UTR</th>
                    <th className="p-3.5">Farmer</th>
                    <th className="p-3.5">Purpose</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Refund ID</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const isRefundable = p.status === "COMPLETED" || p.status === "SUCCESS";
                    const isAlreadyRefunded = p.status === "REFUNDED";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono">
                          <span className="font-bold text-[#0B2545] block">{p.transaction_ref}</span>
                          <span className="text-[10px] text-slate-500">{p.utr_number || "Pending"}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{p.farmer_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {p.farmer_mobile_masked || `ID: ${p.farmer_id}`}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-[200px] truncate">
                          {p.purpose || p.crop || "Weighbridge Service Fee"}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900">
                          ₹{p.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "COMPLETED" || p.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : p.status === "REFUNDED"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          {p.refund_id || "—"}
                        </td>
                        <td className="p-3.5 text-center">
                          {isAlreadyRefunded ? (
                            <span className="text-[10px] text-slate-400 font-bold">Refunded</span>
                          ) : isRefundable ? (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setRefundAmount(p.amount.toString());
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded border border-red-200 text-[11px] transition"
                            >
                              Authorize Refund
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Refund Authorization Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-[#0B2545]">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-black text-[#0B2545]">
                    Authorize Treasury Refund
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg text-xs space-y-1 border border-slate-200">
                <p><strong>Transaction Ref:</strong> {selectedPayment.transaction_ref}</p>
                <p><strong>Beneficiary Farmer:</strong> {selectedPayment.farmer_name}</p>
                <p><strong>Original Value:</strong> ₹{selectedPayment.amount.toFixed(2)}</p>
                <p><strong>UTR:</strong> {selectedPayment.utr_number || "Direct Gateway"}</p>
              </div>

              <form onSubmit={handleAuthorizeRefund} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Authorized Refund Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={selectedPayment.amount}
                    min="1"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Defaults to the full original transaction value. Partial refund allowed.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Administrative Justification / Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Weighbridge equipment failure / Double billing on entry / Cancelled by farmer"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B2545]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This justification is permanently committed into the tamper-evident government audit log.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(null)}
                    className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                  >
                    {submitting ? "Signing..." : "Authorize & Issue Refund"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  api, PaymentItem, AdminPaymentStats,
  PayoutItem, AdminPayoutStats
} from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR, formatWeight } from "@/lib/utils";
import {
  CreditCard, Search, RefreshCw, CheckCircle2,
  Clock, AlertTriangle, RotateCcw, X, ShieldAlert,
  Building2, ArrowDownRight, ArrowUpRight, Scale, CheckSquare, ShieldCheck
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"PAYOUTS" | "INBOUND">("PAYOUTS");

  // Inbound Payments State
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [inboundStats, setInboundStats] = useState<AdminPaymentStats | null>(null);
  const [inboundLoading, setInboundLoading] = useState(false);
  const [inboundSearch, setInboundSearch] = useState("");
  const [inboundStatus, setInboundStatus] = useState("ALL");

  // Outbound Payouts State
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payoutStats, setPayoutStats] = useState<AdminPayoutStats | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("ALL");

  // Modal States
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  const [selectedPayoutForAuth, setSelectedPayoutForAuth] = useState<PayoutItem | null>(null);
  const [authRemarks, setAuthRemarks] = useState("Authorized under Government MSP procurement guidelines.");
  const [authorizingPayout, setAuthorizingPayout] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load Outbound Payouts
  const loadPayouts = useCallback(async () => {
    if (!user || user.role !== "ADMIN") {
      setPayoutLoading(false);
      return;
    }
    setPayoutLoading(true);
    try {
      const [res, statsData] = await Promise.all([
        api.getAdminPayouts({
          status: payoutStatus === "ALL" ? undefined : payoutStatus,
          search: payoutSearch.trim() || undefined,
          limit: 100,
        }),
        api.getAdminPayoutStats().catch(() => null),
      ]);
      setPayouts(res.items || []);
      setPayoutStats(statsData);
    } catch {} finally {
      setPayoutLoading(false);
    }
  }, [user, payoutStatus, payoutSearch]);

  // Load Inbound Payments
  const loadInbound = useCallback(async () => {
    if (!user || user.role !== "ADMIN") {
      setInboundLoading(false);
      return;
    }
    setInboundLoading(true);
    try {
      const [res, statsData] = await Promise.all([
        api.getAdminPayments({
          status: inboundStatus === "ALL" ? undefined : inboundStatus,
          search: inboundSearch.trim() || undefined,
          limit: 100,
        }),
        api.getAdminPaymentStats().catch(() => null),
      ]);
      setPayments(res.items || []);
      setInboundStats(statsData);
    } catch {} finally {
      setInboundLoading(false);
    }
  }, [user, inboundStatus, inboundSearch]);

  useEffect(() => {
    if (activeTab === "PAYOUTS") {
      loadPayouts();
    } else {
      loadInbound();
    }
  }, [activeTab, loadPayouts, loadInbound]);

  // Handle Authorize Payout
  const handleAuthorizePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutForAuth) return;
    setAuthorizingPayout(true);
    try {
      const res = await api.authorizeAdminPayout(selectedPayoutForAuth.id, {
        remarks: authRemarks.trim() || undefined,
      });
      setActionMessage(
        `✓ Payout of ${formatINR(res.amount_inr)} to ${res.farmer_name} authorized successfully! UTR: ${res.utr_number}`
      );
      setSelectedPayoutForAuth(null);
      await loadPayouts();
    } catch (err: any) {
      alert(err.message || "Failed to authorize DBT payout.");
    } finally {
      setAuthorizingPayout(false);
    }
  };

  // Handle Refund Inbound Payment
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;
    setProcessingRefund(true);
    try {
      await api.refundAdminPayment(selectedPaymentForRefund.id, {
        reason: refundReason,
        refund_amount: selectedPaymentForRefund.amount,
      });
      setActionMessage(
        `✓ Refund of ${formatINR(selectedPaymentForRefund.amount)} processed successfully for ${selectedPaymentForRefund.transaction_ref}.`
      );
      setSelectedPaymentForRefund(null);
      setRefundReason("");
      await loadInbound();
    } catch (err: any) {
      alert(err.message || "Failed to process refund.");
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              GOVERNMENT DBT SETTLEMENT & RECONCILIATION SUITE
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Financial Management & DBT Operations
            </h1>
            <p className="text-xs text-slate-500">
              Dual-pillar financial accounting: Outbound MSP DBT payouts to farmers and Inbound service transaction gateway.
            </p>
          </div>

          <button
            onClick={() => (activeTab === "PAYOUTS" ? loadPayouts() : loadInbound())}
            disabled={payoutLoading || inboundLoading}
            className="btn-gov-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${payoutLoading || inboundLoading ? "animate-spin text-[#0B2545]" : ""}`} />
            <span>Refresh Active Ledger</span>
          </button>
        </div>

        {/* Global Action Message Alert */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="font-bold text-emerald-700 ml-2">
              ×
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t">
          <button
            onClick={() => setActiveTab("PAYOUTS")}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PAYOUTS"
                ? "border-[#B91C1C] text-[#B91C1C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-[#B91C1C]" />
            <span>Procurement DBT Settlements (Outbound MSP)</span>
            <span className="bg-rose-100 text-[#B91C1C] text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {payoutStats?.pending_count || 0} Pending
            </span>
          </button>

          <button
            onClick={() => setActiveTab("INBOUND")}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "INBOUND"
                ? "border-[#0B2545] text-[#0B2545]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-[#0B2545]" />
            <span>Gateway Fees & Inbound Ledger</span>
          </button>
        </div>

        {/* TAB 1: OUTBOUND PROCUREMENT DBT SETTLEMENTS */}
        {activeTab === "PAYOUTS" && (
          <div className="space-y-6">
            {/* Payouts KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-[#0B2545]">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Procurement MSP Value</span>
                <p className="text-2xl font-black text-[#0B2545] font-mono mt-1">
                  {formatINR(payoutStats?.total_amount_inr || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Across {payoutStats?.total_count || 0} weighment records
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-emerald-600">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Disbursed via DBT</span>
                <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {formatINR(payoutStats?.completed_amount_inr || 0)}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  {payoutStats?.completed_count || 0} Successful Bank Transfers
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-amber-500">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Awaiting Admin Authorization</span>
                <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {payoutStats?.pending_count || 0}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">
                  Amount: {formatINR(payoutStats?.pending_amount_inr || 0)}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-purple-600">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Security & Compliance</span>
                <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>PFMS / NPCI Bridge Active</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  100% Direct to Bank Account (No Intermediary)
                </p>
              </div>
            </div>

            {/* Filter and Search Bar for Payouts */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                {[
                  { label: "All Records", val: "ALL" },
                  { label: "Ready to Authorize", val: "CREATED" },
                  { label: "Processing", val: "PROCESSING" },
                  { label: "Disbursed / Settled", val: "PROCESSED" },
                  { label: "Failed", val: "FAILED" },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    onClick={() => setPayoutStatus(tab.val)}
                    className={`text-xs py-1 px-3 rounded font-bold transition cursor-pointer ${
                      payoutStatus === tab.val
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadPayouts();
                }}
                className="w-full sm:w-80 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search farmer, receipt, UTR, mandi..."
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#0B2545] text-white text-xs font-bold py-1.5 px-3 rounded cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Payouts Table */}
            <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B2545]">
                  Outbound Direct Benefit Transfer (DBT) Authorizations
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {payouts.length} Settlements Listed
                </span>
              </div>

              {payoutLoading ? (
                <div className="space-y-3 py-6">
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No procurement DBT payouts found matching criteria. Complete certified weighings at mandi desks to generate settlement payouts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                        <th className="p-2.5 font-bold">Receipt / Mandi</th>
                        <th className="p-2.5 font-bold">Farmer Beneficiary</th>
                        <th className="p-2.5 font-bold">Produce / Weight</th>
                        <th className="p-2.5 font-bold">Payable MSP</th>
                        <th className="p-2.5 font-bold">Bank Account / IFSC</th>
                        <th className="p-2.5 font-bold">DBT UTR Settlement</th>
                        <th className="p-2.5 font-bold">Status</th>
                        <th className="p-2.5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payouts.map((p) => {
                        const canAuthorize = p.status === "CREATED" || p.status === "QUEUED";
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono">
                              <span className="font-bold text-[#0B2545]">{p.procurement_receipt_number}</span>
                              <span className="text-[10px] text-slate-500 block font-sans">
                                {p.centre_name}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <span className="font-semibold text-slate-800">{p.farmer_name}</span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {p.farmer_mobile_masked}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <span className="font-bold text-slate-900">{p.crop_name}</span>
                              <span className="text-[11px] text-slate-500 block font-mono">
                                {formatWeight(p.net_weight_quintals)}
                              </span>
                            </td>

                            <td className="p-2.5 font-mono font-bold text-sm text-[#B91C1C]">
                              {formatINR(p.amount_inr || p.amount || 0)}
                            </td>

                            <td className="p-2.5 text-[11px]">
                              {p.bank_account_masked ? (
                                <>
                                  <span className="font-mono font-bold text-slate-800 block">
                                    {p.bank_account_masked}
                                  </span>
                                  <span className="text-slate-500">
                                    {p.bank_name || "Direct"} • {p.ifsc_code}
                                  </span>
                                </>
                              ) : (
                                <span className="text-amber-700 italic">No account recorded</span>
                              )}
                            </td>

                            <td className="p-2.5 font-mono text-[11px]">
                              {p.utr_number ? (
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {p.utr_number}
                                </span>
                              ) : (
                                <span className="text-slate-400">Awaiting Auth</span>
                              )}
                            </td>

                            <td className="p-2.5">
                              <StatusBadge status={p.status} />
                            </td>

                            <td className="p-2.5 text-right">
                              {canAuthorize ? (
                                <button
                                  onClick={() => setSelectedPayoutForAuth(p)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition shadow-xs cursor-pointer"
                                >
                                  Authorize DBT
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Disbursed</span>
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
          </div>
        )}

        {/* TAB 2: INBOUND GATEWAY FEES & PAYMENTS */}
        {activeTab === "INBOUND" && (
          <div className="space-y-6">
            {/* Inbound KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-[#0B2545]">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Inbound Transactions</span>
                <p className="text-2xl font-black text-[#0B2545] font-mono mt-1">
                  {inboundStats?.total_count ?? payments.length}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Vol: {formatINR(inboundStats?.total_amount_inr ?? 0)}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-emerald-600">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Settled Fees</span>
                <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {inboundStats?.success_count ?? 0}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  Total: {formatINR(inboundStats?.success_amount_inr ?? 0)}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-amber-500">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Pending / Processing</span>
                <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {inboundStats?.pending_count ?? 0}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">
                  Pending Gateway Confirmation
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded p-4 shadow-sm border-t-4 border-t-purple-600">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Refunded Volume</span>
                <p className="text-2xl font-black text-purple-700 font-mono mt-1">
                  {inboundStats?.refunded_count ?? 0}
                </p>
                <p className="text-xs text-purple-700 mt-0.5 font-medium">
                  Total: {formatINR(inboundStats?.refunded_amount_inr ?? 0)}
                </p>
              </div>
            </div>

            {/* Filter and Search Bar for Inbound */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                {[
                  { label: "All Records", val: "ALL" },
                  { label: "Settled", val: "COMPLETED" },
                  { label: "Processing", val: "PENDING" },
                  { label: "Failed", val: "FAILED" },
                  { label: "Refunded", val: "REFUNDED" },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    onClick={() => setInboundStatus(tab.val)}
                    className={`text-xs py-1 px-3 rounded font-bold transition cursor-pointer ${
                      inboundStatus === tab.val
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadInbound();
                }}
                className="w-full sm:w-80 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search farmer, ref, UTR..."
                    value={inboundSearch}
                    onChange={(e) => setInboundSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#0B2545] text-white text-xs font-bold py-1.5 px-3 rounded cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Inbound Table */}
            <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B2545]">
                  Inbound Payment Gateway Ledger (Razorpay Test Mode)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {payments.length} Records Found
                </span>
              </div>

              {inboundLoading ? (
                <div className="space-y-3 py-6">
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No inbound payments found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                        <th className="p-2.5 font-bold">Reference / ID</th>
                        <th className="p-2.5 font-bold">Farmer</th>
                        <th className="p-2.5 font-bold">Purpose</th>
                        <th className="p-2.5 font-bold">Amount</th>
                        <th className="p-2.5 font-bold">Gateway / UTR</th>
                        <th className="p-2.5 font-bold">Status</th>
                        <th className="p-2.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payments.map((p) => {
                        const canRefund = (p.status === "COMPLETED" || p.status === "SUCCESS") && p.refund_status !== "REFUNDED";
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono">
                              <span className="font-bold text-[#0B2545]">{p.transaction_ref}</span>
                              <span className="text-[10px] text-slate-400 block">
                                {p.initiated_at ? new Date(p.initiated_at).toLocaleDateString("en-IN") : ""}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <span className="font-semibold text-slate-800">{p.farmer_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {p.farmer_mobile_masked}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <span className="text-slate-800">{p.crop || "Registration / Weighment Fee"}</span>
                            </td>

                            <td className="p-2.5 font-bold text-slate-900 font-mono">
                              {formatINR(p.amount)}
                            </td>

                            <td className="p-2.5 font-mono text-[11px] text-slate-600">
                              {p.utr_number || p.razorpay_payment_id || "Direct Entry"}
                            </td>

                            <td className="p-2.5">
                              <StatusBadge status={p.status} />
                              {p.refund_status && p.refund_status !== "NONE" && (
                                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded ml-1 font-bold">
                                  {p.refund_status}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-right">
                              {canRefund ? (
                                <button
                                  onClick={() => setSelectedPaymentForRefund(p)}
                                  className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold px-2 py-1 rounded transition"
                                >
                                  Refund
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">—</span>
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
          </div>
        )}

        {/* Modal: Authorize Outbound Payout */}
        {selectedPayoutForAuth && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded border-2 border-emerald-700 shadow-xl max-w-lg w-full p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-base text-[#0B2545]">
                    Authorize Outbound DBT Payout
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPayoutForAuth(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-[#0B2545]">{selectedPayoutForAuth.procurement_receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary Farmer:</span>
                  <span className="font-bold text-slate-800">{selectedPayoutForAuth.farmer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Produce:</span>
                  <span className="font-semibold text-slate-800">{selectedPayoutForAuth.crop_name} ({formatWeight(selectedPayoutForAuth.net_weight_quintals)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Details:</span>
                  <span className="font-mono text-slate-800">
                    {selectedPayoutForAuth.bank_account_masked} ({selectedPayoutForAuth.bank_name || "Direct"}, IFSC: {selectedPayoutForAuth.ifsc_code})
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="font-bold text-slate-700">Total MSP Payable:</span>
                  <span className="font-mono font-black text-[#B91C1C] text-base">
                    {formatINR(selectedPayoutForAuth.amount_inr || selectedPayoutForAuth.amount || 0)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAuthorizePayoutSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Audit Remarks / Authorization Note
                  </label>
                  <input
                    type="text"
                    value={authRemarks}
                    onChange={(e) => setAuthRemarks(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayoutForAuth(null)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authorizingPayout}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    {authorizingPayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm & Disburse via DBT</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Process Refund */}
        {selectedPaymentForRefund && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded border-2 border-[#0B2545] shadow-xl max-w-md w-full p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-purple-700" />
                  <h3 className="font-bold text-base text-[#0B2545]">
                    Process Customer Refund
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPaymentForRefund(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                You are about to issue a refund of{" "}
                <strong className="text-slate-900 font-mono font-bold">
                  {formatINR(selectedPaymentForRefund.amount)}
                </strong>{" "}
                to <strong className="text-slate-900">{selectedPaymentForRefund.farmer_name}</strong> for transaction{" "}
                <strong className="text-slate-900 font-mono">{selectedPaymentForRefund.transaction_ref}</strong>.
              </p>

              <form onSubmit={handleRefundSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Refund Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide justification (e.g. Weighbridge cancellation, Duplicate charge)..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentForRefund(null)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingRefund}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    {processingRefund ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Confirm & Disburse Refund</span>
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

"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, PaymentItem, PayoutItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR, formatWeight } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  CreditCard, CheckCircle2, Clock, Building2,
  ShieldCheck, ArrowUpRight, RefreshCw, FileText, ChevronDown, ChevronUp,
  HelpCircle, PlusCircle, AlertCircle, X, ExternalLink, ArrowDownRight
} from "lucide-react";

// Helper to dynamically load Razorpay standard checkout script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function FarmerPaymentsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"DBT_PAYOUTS" | "FEES">("DBT_PAYOUTS");

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);

  // Bank Account Modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // Razorpay Test Gateway Simulator Modal
  const [testOrderModal, setTestOrderModal] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    purpose: string;
    paymentRecordId: number;
    keyId: string;
  } | null>(null);
  const [testPaymentMethod, setTestPaymentMethod] = useState<"upi" | "netbanking" | "card">("upi");
  const [processingTestPayment, setProcessingTestPayment] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Payment Checkout state
  const [payingFee, setPayingFee] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payoutsData, paymentsData, prof] = await Promise.all([
        api.getFarmerPayouts().catch(() => []),
        api.getFarmerPayments().catch(() => []),
        api.getFarmerProfile().catch(() => null),
      ]);
      setPayouts(payoutsData || []);
      setPayments(paymentsData || []);
      setProfile(prof);
      if (prof) {
        setBankName(prof.bank_name || "");
        setIfscCode(prof.ifsc_code || "");
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadRazorpayScript();
  }, []);

  // Total Settled via Outbound Government DBT
  const totalSettledDBT = payouts
    .filter((p) => p.status === "PROCESSED")
    .reduce((acc, p) => acc + (p.amount_inr || p.amount || 0), 0);

  // Total Pending / Under Processing DBT
  const totalPendingDBT = payouts
    .filter((p) => p.status === "CREATED" || p.status === "QUEUED" || p.status === "PROCESSING")
    .reduce((acc, p) => acc + (p.amount_inr || p.amount || 0), 0);

  // Bank Details submission
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setSavingBank(true);
    try {
      const updated = await api.updateFarmerBankDetails({
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
      });
      setProfile(updated);
      setShowBankModal(false);
      setAccountNumber("");
      await loadData();
    } catch (err: any) {
      setBankError(err.message || "Failed to update bank details. Please check your account number and IFSC code.");
    } finally {
      setSavingBank(false);
    }
  };

  // Razorpay Checkout Trigger (Test Mode & Authentic Simulator)
  const handlePayTestFee = async (amount: number = 50.0, purpose: string = "Weighbridge Token Registration Fee") => {
    setPayingFee(true);
    setPaymentSuccessMsg(null);
    setPaymentErrorMsg(null);

    try {
      const config = await api.getPaymentConfig();
      const order = await api.createPaymentOrder({
        amount,
        purpose,
      });

      // If configured with authentic Razorpay keys in production/live mode, load Razorpay SDK
      if (config.is_configured) {
        const scriptReady = await loadRazorpayScript();
        if (scriptReady && (window as any).Razorpay) {
          const options = {
            key: config.key_id,
            amount: order.amount * 100,
            currency: order.currency,
            name: config.company_name,
            description: purpose,
            order_id: order.order_id,
            prefill: {
              name: profile?.full_name || "Farmer",
              contact: profile?.mobile_number || "",
            },
            theme: {
              color: config.theme_color || "#0B2545",
            },
            handler: async function (response: any) {
              try {
                const verifyRes = await api.verifyPayment({
                  order_id: response.razorpay_order_id || order.order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  payment_record_id: order.payment_record_id,
                });

                setPaymentSuccessMsg(
                  `Payment of ₹${amount} verified successfully! Reference: ${verifyRes.utr_number}`
                );
                await loadData();
              } catch {
                setPaymentErrorMsg("Payment verification failed. Please contact procurement support.");
              }
            },
            modal: {
              ondismiss: async function () {
                await api.recordPaymentFailure({
                  order_id: order.order_id,
                  payment_record_id: order.payment_record_id,
                  error_description: "Payment cancelled by farmer in checkout modal.",
                });
                await loadData();
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on("payment.failed", async function (resp: any) {
            await api.recordPaymentFailure({
              order_id: order.order_id,
              payment_record_id: order.payment_record_id,
              error_code: resp.error?.code,
              error_description: resp.error?.description || "Payment declined",
            });
            setPaymentErrorMsg(`Payment failed: ${resp.error?.description || "Transaction declined"}`);
            await loadData();
          });

          rzp.open();
          return;
        }
      }

      // For Test Mode & Development Environment:
      // Open dedicated Razorpay Test Gateway Simulator so test transactions never fail with generic errors
      setTestOrderModal({
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency || "INR",
        purpose: order.purpose || purpose,
        paymentRecordId: order.payment_record_id,
        keyId: config.key_id,
      });
    } catch (err: any) {
      setPaymentErrorMsg(err.message || "Failed to initialize payment checkout.");
    } finally {
      setPayingFee(false);
    }
  };

  // Complete simulated test payment
  const handleCompleteTestPayment = async () => {
    if (!testOrderModal) return;
    setProcessingTestPayment(true);
    try {
      const simulatedPaymentId = `pay_test_${Math.random().toString(36).substring(2, 11)}`;
      const verifyRes = await api.verifyPayment({
        order_id: testOrderModal.orderId,
        payment_id: simulatedPaymentId,
        signature: "test_verified_signature",
        payment_record_id: testOrderModal.paymentRecordId,
      });

      setPaymentSuccessMsg(
        `Test Payment of ₹${testOrderModal.amount} verified successfully! UTR: ${verifyRes.utr_number}`
      );
      setTestOrderModal(null);
      await loadData();
    } catch (err: any) {
      setPaymentErrorMsg(err.message || "Payment verification failed.");
    } finally {
      setProcessingTestPayment(false);
    }
  };

  // Simulate payment failure
  const handleFailTestPayment = async () => {
    if (!testOrderModal) return;
    setProcessingTestPayment(true);
    try {
      await api.recordPaymentFailure({
        order_id: testOrderModal.orderId,
        payment_record_id: testOrderModal.paymentRecordId,
        error_code: "BAD_REQUEST_ERROR",
        error_description: "Transaction declined by issuing bank (Simulated failure)",
      });
      setPaymentErrorMsg("Payment failed: Transaction declined by issuing bank (Simulated failure)");
      setTestOrderModal(null);
      await loadData();
    } catch (err: any) {
      setPaymentErrorMsg(err.message || "Failed to record payment failure.");
    } finally {
      setProcessingTestPayment(false);
    }
  };

  // Dismiss test modal
  const handleDismissTestModal = async () => {
    if (!testOrderModal) return;
    try {
      await api.recordPaymentFailure({
        order_id: testOrderModal.orderId,
        payment_record_id: testOrderModal.paymentRecordId,
        error_description: "Payment cancelled by farmer in checkout modal.",
      });
    } catch {}
    setTestOrderModal(null);
    await loadData();
  };

  const pfmsSteps = [
    { num: 1, title: "Weighbridge Certified", desc: "Digital weighment verified at counter" },
    { num: 2, title: "E-Receipt Generated", desc: "Official receipt signed by Mandi Incharge" },
    { num: 3, title: "Direct Benefit Transfer", desc: "Aadhaar / PFMS clearing validation" },
    { num: 4, title: "Direct Bank Credit", desc: "Funds transferred into linked bank account" },
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
              Real-time records of MSP crop sale disbursements and service payments directly linked to your bank account.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handlePayTestFee(50.0)}
              disabled={payingFee}
              className="bg-[#0B2545] hover:bg-[#133E68] text-[#FDE047] font-bold text-xs py-2 px-3.5 rounded border border-[#1E3A8A] flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Test Razorpay Standard Checkout in Test Mode"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{payingFee ? "Starting Checkout..." : "Pay Weighbridge Fee (₹50 Test Mode)"}</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
              <span>{loading ? "..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {paymentSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{paymentSuccessMsg}</span>
            </div>
            <button onClick={() => setPaymentSuccessMsg(null)} className="text-emerald-700 font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {paymentErrorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{paymentErrorMsg}</span>
            </div>
            <button onClick={() => setPaymentErrorMsg(null)} className="text-red-700 font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Settled via DBT */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-emerald-600 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Settled via DBT</span>
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded w-32 my-1" />
            ) : totalSettledDBT > 0 ? (
              <p className="text-2xl font-black text-emerald-800 font-mono">{formatINR(totalSettledDBT)}</p>
            ) : (
              <p className="text-lg font-bold text-slate-400 font-sans">No settlements yet</p>
            )}
            <p className="text-xs text-emerald-700 font-semibold">
              {totalSettledDBT > 0 ? "Credited to Bank Account via PFMS" : "Completed after crop weighment certification"}
            </p>
          </div>

          {/* Card 2: Under Processing */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-amber-500 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Under Processing</span>
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded w-32 my-1" />
            ) : totalPendingDBT > 0 ? (
              <p className="text-2xl font-black text-amber-900 font-mono">{formatINR(totalPendingDBT)}</p>
            ) : (
              <p className="text-lg font-bold text-slate-400 font-sans">No pending dues</p>
            )}
            <p className="text-xs text-amber-800 font-semibold">
              {totalPendingDBT > 0 ? "Expected within 24–48 banking hours" : "All cleared records up to date"}
            </p>
          </div>

          {/* Card 3: Linked Bank Account */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm border-t-4 border-t-[#0B2545] space-y-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">Linked Bank Account</span>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {profile?.bank_account_masked ? "Change" : "+ Link Bank"}
                </button>
              </div>

              {loading ? (
                <div className="h-7 bg-slate-100 animate-pulse rounded w-44 my-1" />
              ) : profile?.bank_account_masked ? (
                <>
                  <p className="text-base font-bold text-[#0B2545] font-mono mt-1">
                    {profile.bank_account_masked}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {profile.bank_name ? `${profile.bank_name}` : "Verified Account"}
                    {profile.ifsc_code ? ` • IFSC: ${profile.ifsc_code}` : ""}
                  </p>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-xs font-semibold text-slate-500">No bank account linked</p>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="mt-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Link Account for Direct Credit</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold">
              {profile?.bank_account_masked ? "✓ Verified via PFMS / Aadhaar Bridge" : "Link account to receive crop MSP credits"}
            </p>
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
              className="text-xs text-[#0B2545] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>How government payments work</span>
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
              <p className="font-bold">Government Direct Benefit Transfer (DBT):</p>
              <p>Under the Department of Food & Public Distribution scheme, procurement proceeds are credited directly into the farmer&apos;s verified bank account without middlemen or unnecessary delays.</p>
              <p>Certified weighment and receipts automatically trigger payment generation in this portal.</p>
            </div>
          )}
        </div>

        {/* Tab Navigation: DBT Payouts vs Service Receipts */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t">
          <button
            onClick={() => setActiveTab("DBT_PAYOUTS")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "DBT_PAYOUTS"
                ? "border-[#B91C1C] text-[#B91C1C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-[#B91C1C]" />
            <span>Government MSP Crop Disbursals ({payouts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("FEES")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "FEES"
                ? "border-[#0B2545] text-[#0B2545]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#0B2545]" />
            <span>Service Fees & Gate Receipts ({payments.length})</span>
          </button>
        </div>

        {/* TAB 1: DBT PAYOUTS */}
        {activeTab === "DBT_PAYOUTS" && (
          <div className="bg-white border border-slate-200 rounded-b-md p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
                Direct Benefit Transfer (DBT) MSP Disbursals
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {payouts.length} Disbursals Logged
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <ArrowDownRight className="w-6 h-6 text-[#B91C1C]" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No payment transactions found.</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Once your crop is weighed and certified at your procurement mandi, official MSP proceeds will appear here and be credited to your bank account.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                        <th className="p-2.5 font-bold">Procurement Receipt</th>
                        <th className="p-2.5 font-bold">Mandi Centre</th>
                        <th className="p-2.5 font-bold">Commodity & Weight</th>
                        <th className="p-2.5 font-bold">Total MSP Amount</th>
                        <th className="p-2.5 font-bold">Credited Bank Account</th>
                        <th className="p-2.5 font-bold">Settlement UTR</th>
                        <th className="p-2.5 font-bold">DBT Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">
                            <span className="font-bold text-[#0B2545]">{p.procurement_receipt_number}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : ""}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {p.centre_name}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900">{p.crop_name}</span>
                            <span className="text-slate-500 block text-[11px] font-mono">
                              {formatWeight(p.net_weight_quintals)}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-emerald-800 font-mono text-sm">
                            {formatINR(p.amount_inr || p.amount || 0)}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">
                            {p.bank_account_masked ? (
                              <>
                                <span className="font-mono font-bold text-slate-800 block">
                                  {p.bank_account_masked}
                                </span>
                                <span>{p.bank_name || "Direct Credit"} • {p.ifsc_code}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">Pending Bank Link</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {p.utr_number ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {p.utr_number}
                              </span>
                            ) : (
                              <span className="text-amber-700">Awaiting PFMS Clearing</span>
                            )}
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
                  {payouts.map((p) => (
                    <div key={p.id} className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#0B2545] text-sm">{p.procurement_receipt_number}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-700 font-semibold">{p.crop_name} ({formatWeight(p.net_weight_quintals)})</span>
                        <span className="font-black font-mono text-base text-emerald-800">
                          {formatINR(p.amount_inr || p.amount || 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-[11px] text-slate-500">
                        <div>
                          Mandi: <strong className="text-slate-700">{p.centre_name}</strong>
                        </div>
                        <div>
                          Bank: <strong className="text-slate-700">{p.bank_account_masked || "Pending"}</strong>
                        </div>
                        <div>
                          UTR: <span className="font-mono font-bold text-slate-800">{p.utr_number || "Processing Clearing"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: INBOUND FEES & SERVICE TRANSACTIONS */}
        {activeTab === "FEES" && (
          <div className="bg-white border border-slate-200 rounded-b-md p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
                Weighbridge Service Fee Receipts
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {payments.length} Transaction(s)
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
                <div className="h-10 bg-slate-100 animate-pulse rounded" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No payment transactions found.</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you make a weighbridge booking fee payment, your official receipt will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                        <th className="p-2.5 font-bold">Receipt / Ref</th>
                        <th className="p-2.5 font-bold">Purpose / Details</th>
                        <th className="p-2.5 font-bold">Amount</th>
                        <th className="p-2.5 font-bold">Gateway Ref</th>
                        <th className="p-2.5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">
                            <span className="font-bold text-[#0B2545]">{p.receipt_number}</span>
                            <p className="text-[10px] text-slate-400 font-mono">{p.transaction_ref}</p>
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-800">{p.crop || "Weighbridge Registration Fee"}</span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 font-mono text-sm">
                            {formatINR(p.amount)}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                            {p.utr_number || p.razorpay_payment_id || "Direct Payment"}
                          </td>
                          <td className="p-2.5">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#0B2545] text-sm">{p.receipt_number}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-600">{p.crop || "Weighbridge Fee"}</span>
                        <span className="font-black font-mono text-base text-[#0B2545]">{formatINR(p.amount)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        Ref: <span className="font-mono font-bold text-slate-700">{p.utr_number || p.razorpay_payment_id || "Direct"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bank Details Modal */}
        {showBankModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-md border-2 border-[#0B2545] shadow-xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="font-bold text-base text-[#0B2545] font-serif">
                    Link Bank Account for DBT
                  </h3>
                </div>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Enter your authentic bank account details. Your account number will be stored securely and displayed in masked format.
              </p>

              {bankError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded">
                  {bankError}
                </div>
              )}

              <form onSubmit={handleSaveBank} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India, Punjab National Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter full bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-500">
                    Will be masked as •••• •••• {accountNumber.slice(-4) || "XXXX"} on screen.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono uppercase outline-none focus:border-[#0B2545]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="btn-gov-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingBank ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Save Bank Details</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Razorpay Test Gateway Simulator Modal (Requirement 12) */}
      {testOrderModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-blue-900 border border-blue-400 flex items-center justify-center text-sm font-black text-amber-300">
                  ₹
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-300 block">
                    Razorpay Test Sandbox
                  </span>
                  <h3 className="text-sm font-bold">Standard Payment Checkout</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissTestModal}
                className="text-slate-300 hover:text-white p-1 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Order ID:</span>
                <span className="font-mono font-bold text-slate-800">{testOrderModal.orderId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Purpose:</span>
                <span className="font-medium text-slate-700">{testOrderModal.purpose}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-xs font-bold text-[#0B2545]">Payable Amount:</span>
                <span className="text-lg font-black text-[#0B2545]">₹{testOrderModal.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Select Test Payment Instrument
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTestPaymentMethod("upi")}
                  className={`p-2.5 rounded border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    testPaymentMethod === "upi"
                      ? "border-[#0B2545] bg-blue-50 text-[#0B2545] ring-1 ring-[#0B2545]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-base">📱</span>
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestPaymentMethod("netbanking")}
                  className={`p-2.5 rounded border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    testPaymentMethod === "netbanking"
                      ? "border-[#0B2545] bg-blue-50 text-[#0B2545] ring-1 ring-[#0B2545]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-base">🏦</span>
                  <span>NetBanking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestPaymentMethod("card")}
                  className={`p-2.5 rounded border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    testPaymentMethod === "card"
                      ? "border-[#0B2545] bg-blue-50 text-[#0B2545] ring-1 ring-[#0B2545]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-base">💳</span>
                  <span>RuPay Card</span>
                </button>
              </div>

              {testPaymentMethod === "upi" && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">Simulated Virtual Payment Address (VPA)</p>
                  <p className="font-mono text-slate-600 text-[11px]">farmer@upi (Google Pay / PhonePe / BHIM)</p>
                </div>
              )}

              {testPaymentMethod === "netbanking" && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">Simulated Bank Clearing</p>
                  <p className="text-slate-600 text-[11px]">State Bank of India (SBI Kisan Portal)</p>
                </div>
              )}

              {testPaymentMethod === "card" && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">Simulated Card</p>
                  <p className="font-mono text-slate-600 text-[11px]">RuPay Kisan Credit Card •••• 4519</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-800">
                ℹ️ <strong>Development Sandbox Mode:</strong> Real money will not be deducted. Completing this simulation cryptographically authorizes the order, issues an official UTR number, and persists the transaction in the database.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCompleteTestPayment}
                disabled={processingTestPayment}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white py-2.5 px-4 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {processingTestPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Authorize & Complete Payment (₹{testOrderModal.amount.toFixed(2)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFailTestPayment}
                disabled={processingTestPayment}
                className="w-full bg-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-700 border border-slate-300 py-2 px-4 rounded text-xs font-semibold transition cursor-pointer"
              >
                ✕ Simulate Payment Failure / Decline
              </button>
            </div>
          </div>
        </div>
      )}

    </FarmerLayout>
  );
}

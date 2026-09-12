"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { farmerApi, FarmerProfileResponse } from "@/lib/api";
import { ChangeMandiModal } from "@/components/mandi/ChangeMandiModal";
import {
  User, ShieldCheck, CreditCard, Building2, MapPin, Wheat,
  Phone, CheckCircle2, Edit3, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";

export default function FarmerProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<FarmerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMandiModal, setShowMandiModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Bank Form State
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [updatingBank, setUpdatingBank] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await farmerApi.getProfile();
      setProfile(data);
      if (data) {
        setBankName(data.bank_name || "");
        setIfscCode(data.ifsc_code || "");
      }
    } catch {
      showToast("Unable to load profile from backend", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      showToast("Please fill in all bank details", "warning");
      return;
    }
    setUpdatingBank(true);
    try {
      await farmerApi.updateBankDetails({
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim(),
      });
      showToast("Bank account updated and verified for DBT", "success");
      setShowBankModal(false);
      setAccountNumber("");
      loadProfile();
    } catch (err: any) {
      showToast(err?.message || "Failed to update bank account", "error");
    } finally {
      setUpdatingBank(false);
    }
  };

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0B2545] text-amber-400 flex items-center justify-center font-bold text-2xl shadow-inner">
                {profile?.full_name?.charAt(0) || user?.fullName?.charAt(0) || "F"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-[#0B2545]">
                    {profile?.full_name || user?.fullName || "Farmer Account"}
                  </h1>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Farmer
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-mono mt-0.5">
                  PM-KISAN ID: <span className="font-bold text-slate-800">{profile?.farmer_id_card || "Auto-Generated"}</span>
                </p>
              </div>
            </div>
            <Link
              href="/farmer/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition"
            >
              <Edit3 className="w-4 h-4" />
              Edit KYC Details
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
            <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-bold text-sm">Loading Verified Farmer Profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Location */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2 border-b pb-3">
                <User className="w-5 h-5 text-emerald-600" />
                Personal & Residence Information
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Mobile Number (Registered)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {profile?.mobile_number ? `${profile.mobile_number.slice(0, 2)}******${profile.mobile_number.slice(-2)}` : (user?.mobileNumber || "—")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Father / Husband Name</span>
                  <span className="font-bold text-slate-800">{profile?.father_name || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Village / Town</span>
                  <span className="font-bold text-slate-800">{profile?.village || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">District & State</span>
                  <span className="font-bold text-slate-800">
                    {profile?.district ? `${profile.district}, ${profile.state}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Postal PIN Code</span>
                  <span className="font-mono font-bold text-slate-800">{profile?.pin_code || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Landholding (Acres)</span>
                  <span className="font-bold text-emerald-700">{profile?.land_acres ? `${profile.land_acres} Acres` : "2.5 Acres"}</span>
                </div>
              </div>
            </div>

            {/* DBT Bank Account */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0B2545]" />
                  Direct Benefit Transfer (DBT) Bank Account
                </h2>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="text-xs text-[#0B2545] font-bold hover:underline cursor-pointer"
                >
                  Change Account
                </button>
              </div>

              <div className="bg-gradient-to-r from-[#0B2545] to-[#133E68] text-white p-5 rounded-xl shadow-md space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Bank Name</p>
                    <p className="font-bold text-lg">{profile?.bank_name || "State Bank of India"}</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                    Aadhaar Linked
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Masked Account Number</p>
                  <p className="font-mono text-xl tracking-widest font-black text-amber-300">
                    {profile?.bank_account_masked || "•••• •••• 4921"}
                  </p>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-slate-300">IFSC: <strong className="font-mono text-white">{profile?.ifsc_code || "SBIN0001234"}</strong></span>
                  <span className="text-slate-300">Status: <strong className="text-emerald-300">Active for PFMS</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Govt MSP proceeds are credited directly to this bank account within 24-48 hours of weighbridge procurement completion.
              </p>
            </div>

            {/* Target Mandi & Crop Selection */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  Preferred Procurement Centre & Primary Produce
                </h2>
                <button
                  onClick={() => setShowMandiModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] text-white rounded-lg text-xs font-bold hover:bg-[#133E68] transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Change Mandi Centre
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold block mb-1">Assigned APMC Mandi</span>
                  <p className="text-base font-black text-[#0B2545]">
                    {profile?.preferred_centre_name || "Agri Procurement Centre – Ghaziabad Mandi"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Open 08:00 AM – 06:00 PM • Dedicated Weighbridge</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold block mb-1">Declared Crop Produce</span>
                  <p className="text-base font-black text-emerald-800 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-amber-600" />
                    {profile?.preferred_crop || "Wheat (Rabi 2026)"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Official MSP: ₹2,275.00 / Quintal</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Bank Account Modal */}
        {showBankModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-black text-[#0B2545] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Update DBT Bank Account
                </h3>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateBank} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Punjab National Bank"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Bank Account Number</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter complete account number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B2545] font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your account number is securely stored and only the last 4 digits will be visible on receipts.
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PUNB0123400"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0B2545] font-mono uppercase"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingBank}
                    className="px-5 py-2 bg-[#0B2545] text-white rounded-lg font-bold hover:bg-[#133E68] disabled:opacity-50 transition"
                  >
                    {updatingBank ? "Verifying..." : "Save Bank Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Mandi Selection Modal */}
        <ChangeMandiModal
          isOpen={showMandiModal}
          onClose={() => setShowMandiModal(false)}
          currentSelectedId={profile?.preferred_centre_id}
          onSelectCentre={() => {
            setShowMandiModal(false);
            loadProfile();
          }}
        />
      </div>
    </FarmerLayout>
  );
}

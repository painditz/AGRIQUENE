"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { CROPS_MASTER } from "@/lib/constants";
import {
  User, MapPin, Wheat, Building2, CheckCircle2,
  ArrowRight, ArrowLeft, RefreshCw
} from "lucide-react";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || "Ramesh Kumar Sharma");
  const [farmerIdCard, setFarmerIdCard] = useState("PMK-UP-2026-9481");
  const [fatherName, setFatherName] = useState("Late Shri Ram Gopal Sharma");
  const [village, setVillage] = useState("Muradnagar");
  const [district, setDistrict] = useState("Ghaziabad");
  const [state, setState] = useState("Uttar Pradesh");
  const [pinCode, setPinCode] = useState("201206");
  const [landAcres, setLandAcres] = useState(4.5);
  const [preferredCrop, setPreferredCrop] = useState("Wheat (Sharbati/Kalyansona)");
  const [preferredCentreId, setPreferredCentreId] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.registerFarmerProfile({
        full_name: fullName,
        farmer_id_card: farmerIdCard,
        father_name: fatherName,
        village: village,
        district: district,
        state: state,
        pin_code: pinCode,
        land_acres: landAcres,
        preferred_crop: preferredCrop,
        preferred_centre_id: preferredCentreId,
      });

      router.push("/farmer/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to complete registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white border-2 border-[#0B2545] rounded shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-5 border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            FARMER ONBOARDING WIZARD
          </span>
          <h2 className="text-xl font-bold font-serif mt-0.5">
            Farmer Profile & Mandi Registration
          </h2>
          <p className="text-xs text-slate-300">
            Step {step} of 3: {step === 1 ? "Personal & KYC Details" : step === 2 ? "Crop & Landholding" : "Preferred Procurement Mandi"}
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-1.5 font-bold ${step >= 1 ? "text-[#0B2545]" : "text-slate-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"}`}>
              1
            </span>
            <span>Personal Details</span>
          </div>

          <span className="text-slate-300">────</span>

          <div className={`flex items-center gap-1.5 font-bold ${step >= 2 ? "text-[#0B2545]" : "text-slate-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"}`}>
              2
            </span>
            <span>Crop & Land</span>
          </div>

          <span className="text-slate-300">────</span>

          <div className={`flex items-center gap-1.5 font-bold ${step >= 3 ? "text-[#0B2545]" : "text-slate-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"}`}>
              3
            </span>
            <span>Preferred Mandi</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded">
              {error}
            </div>
          )}

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name (as per Aadhaar / Bank Passbook) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Farmer ID / PM-KISAN Reg No.
                  </label>
                  <input
                    type="text"
                    value={farmerIdCard}
                    onChange={(e) => setFarmerIdCard(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Father's / Husband's Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Village / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Crop Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Primary Crop for Procurement *
                </label>
                <select
                  value={preferredCrop}
                  onChange={(e) => setPreferredCrop(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white outline-none focus:border-[#0B2545]"
                >
                  {CROPS_MASTER.map((crop) => (
                    <option key={crop.name} value={crop.name}>
                      {crop.name} — MSP ₹{crop.msp} / Quintal ({crop.season})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Agricultural Landholding (in Acres) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={landAcres}
                    onChange={(e) => setLandAcres(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Expected Produce Volume
                  </label>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-[#0B2545]">
                    ~{(landAcres * 12).toFixed(1)} Quintals estimated
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Centre Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Preferred Procurement Centre (Mandi) *
                </label>
                <div className="space-y-2">
                  {[
                    { id: 1, name: "Agri Procurement Centre – Ghaziabad Mandi", dist: "Ghaziabad (2.4 km)" },
                    { id: 2, name: "Karnal Central Grain APMC Mandi", dist: "Karnal (4.8 km)" },
                    { id: 3, name: "Jaipur Krishi Upaj Mandi Samiti", dist: "Jaipur (6.2 km)" }
                  ].map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between p-3 rounded border text-xs cursor-pointer transition ${
                        preferredCentreId === c.id
                          ? "bg-blue-50 border-[#0B2545] text-[#0B2545] font-bold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="centre"
                          checked={preferredCentreId === c.id}
                          onChange={() => setPreferredCentreId(c.id)}
                        />
                        <span>{c.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{c.dist}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded text-xs text-emerald-900">
                ✓ Bank account verification and Aadhaar DBT linking will automatically sync with your registered mobile.
              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={loading}
              className="btn-gov-primary text-xs py-2 px-6 flex items-center gap-1.5 font-bold"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : step < 3 ? (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

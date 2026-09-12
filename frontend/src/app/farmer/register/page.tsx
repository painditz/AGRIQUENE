"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, CentreItem, CropItem } from "@/lib/api";
import {
  User, MapPin, Wheat, Building2, CheckCircle2,
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle,
  Clock, Activity, Sparkles, Navigation
} from "lucide-react";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const { user, login, updateUser } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State - Step 1: Personal KYC
  const [fullName, setFullName] = useState(
    user?.fullName && user.fullName !== "New Farmer" ? user.fullName : ""
  );
  const [farmerIdCard, setFarmerIdCard] = useState(
    user?.mobileNumber === "9876543210" ? "PMK-UP-2026-9481" : ""
  );
  const [fatherName, setFatherName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("Ghaziabad");
  const [state, setState] = useState("Uttar Pradesh");
  const [pinCode, setPinCode] = useState("");

  // Form State - Step 2: Crop & Land
  const [crops, setCrops] = useState<CropItem[]>([]);
  const [preferredCrop, setPreferredCrop] = useState("");
  const [landAcres, setLandAcres] = useState(2.5);

  // Form State - Step 3: Mandi Selection
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [centresLoading, setCentresLoading] = useState(false);
  const [centresError, setCentresError] = useState<string | null>(null);
  const [preferredCentreId, setPreferredCentreId] = useState<number | null>(null);

  // Load Crops from backend database
  useEffect(() => {
    async function loadCrops() {
      try {
        const data = await api.getCrops();
        setCrops(data);
        if (data.length > 0 && !preferredCrop) {
          setPreferredCrop(data[0].name);
        }
      } catch (e) {
        console.error("Failed to load crops", e);
      }
    }
    loadCrops();
  }, []);

  // Fetch Centres from backend database
  const loadCentres = async () => {
    setCentresLoading(true);
    setCentresError(null);
    try {
      const data = await api.getCentres();
      if (!Array.isArray(data) || data.length === 0) {
        setCentresError("No procurement centres currently active in the database.");
      } else {
        setCentres(data);
        // Preselect matching district centre or first
        if (!preferredCentreId || !data.some((c) => c.id === preferredCentreId)) {
          const matched = data.find((c) => c.district.toLowerCase() === district.toLowerCase()) || data[0];
          setPreferredCentreId(matched.id);
        }
      }
    } catch (err: any) {
      setCentresError(
        "Unable to load procurement centres from the server. Please check that the AGRIQUENE backend is running and click Retry."
      );
    } finally {
      setCentresLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfileAndCentres = async () => {
      try {
        const prof = await api.getFarmerProfile();
        if (prof && isMounted) {
          if (prof.full_name && prof.full_name !== "New Farmer") setFullName(prof.full_name);
          if (prof.farmer_id_card) setFarmerIdCard(prof.farmer_id_card);
          if (prof.father_name) setFatherName(prof.father_name);
          if (prof.village) setVillage(prof.village);
          if (prof.district) setDistrict(prof.district);
          if (prof.state) setState(prof.state);
          if (prof.pin_code) setPinCode(prof.pin_code);
          if (prof.land_acres) setLandAcres(prof.land_acres);
          if (prof.preferred_crop) setPreferredCrop(prof.preferred_crop);
          if (prof.preferred_centre_id) setPreferredCentreId(prof.preferred_centre_id);
        }
      } catch {
        // Fallback: If fresh user with mobile, pre-populate name or leave blank
        if (user?.fullName && user.fullName !== "New Farmer") {
          setFullName(user.fullName);
        }
      }
      if (isMounted) {
        await loadCentres();
      }
    };

    loadProfileAndCentres();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // When user reaches step 3, ensure centres are loaded
  useEffect(() => {
    if (step === 3 && centres.length === 0 && !centresLoading) {
      loadCentres();
    }
  }, [step]);

  // Handle Step Advancement & Submission
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Step 1 Validation
    if (step === 1) {
      if (!fullName.trim()) {
        setFormError("Please enter your full name as per Aadhaar / Bank record.");
        return;
      }
      if (!village.trim() || !district.trim() || !state.trim()) {
        setFormError("Please complete your village, district, and state details.");
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 Validation
    if (step === 2) {
      if (!preferredCrop) {
        setFormError("Please select your primary crop for procurement.");
        return;
      }
      if (landAcres <= 0) {
        setFormError("Please enter a valid landholding acreage.");
        return;
      }
      setStep(3);
      return;
    }

    // Step 3 Submission
    if (step === 3) {
      if (!preferredCentreId) {
        setFormError("Please select your preferred procurement mandi centre.");
        return;
      }
      handleCompleteRegistration();
    }
  };

  const handleCompleteRegistration = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await api.registerFarmerProfile({
        full_name: fullName.trim(),
        farmer_id_card: farmerIdCard.trim() || undefined,
        father_name: fatherName.trim() || undefined,
        address: `${village}, ${district}`,
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        pin_code: pinCode.trim() || undefined,
        land_acres: Number(landAcres) || 2.5,
        preferred_crop: preferredCrop,
        preferred_centre_id: preferredCentreId,
      });

      if (updateUser) {
        updateUser({
          fullName: response.full_name,
          isRegistered: true,
          centreId: response.preferred_centre_id,
          centreName: response.preferred_centre_name,
        });
      }

      setSuccessMsg("Farmer registration completed successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/farmer/dashboard");
      }, 1200);
    } catch (err: any) {
      const msg = err.message || "Unable to complete registration. Please check your connection.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white border-2 border-[#0B2545] rounded shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-5 border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            FARMER ONBOARDING WIZARD · किसान पंजीकरण
          </span>
          <h1 className="text-xl font-bold font-serif mt-0.5">
            Farmer Profile & Mandi Registration
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Step {step} of 3:{" "}
            {step === 1
              ? "Personal & KYC Details (व्यक्तिगत विवरण)"
              : step === 2
              ? "Crop & Landholding (फसल एवं भूमि)"
              : "Preferred Procurement Mandi (मंडी चयन)"}
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 font-bold transition ${
              step >= 1 ? "text-[#0B2545]" : "text-slate-400"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 1 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              1
            </span>
            <span>Personal Details</span>
          </button>

          <span className="text-slate-300">────</span>

          <button
            type="button"
            onClick={() => fullName.trim() && setStep(2)}
            disabled={step < 2 && !fullName.trim()}
            className={`flex items-center gap-1.5 font-bold transition ${
              step >= 2 ? "text-[#0B2545]" : "text-slate-400"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 2 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              2
            </span>
            <span>Crop & Land</span>
          </button>

          <span className="text-slate-300">────</span>

          <button
            type="button"
            onClick={() => fullName.trim() && setStep(3)}
            disabled={step < 3 && !fullName.trim()}
            className={`flex items-center gap-1.5 font-bold transition ${
              step >= 3 ? "text-[#0B2545]" : "text-slate-400"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 3 ? "bg-[#0B2545] text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              3
            </span>
            <span>Preferred Mandi</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleNextStep} className="p-6 space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention Required:</p>
                <p>{formError}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3 rounded flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name (as per Aadhaar / Bank Record) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Farmer ID / PM-KISAN Reg No.
                    <span className="text-slate-400 font-normal lowercase ml-1">(auto-assigned if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. PMK-UP-2026-${user?.mobileNumber ? user.mobileNumber.slice(-4) : "9481"}`}
                    value={farmerIdCard}
                    onChange={(e) => setFarmerIdCard(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Father's / Husband's Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Late Shri Ram Gopal Sharma"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded p-3 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[#0B2545]">
                  Search Location or Auto-Detect Address:
                </label>
                <AddressAutocomplete
                  onLocationSelect={(loc) => {
                    if (loc.name) setVillage(loc.name);
                    if (loc.district) setDistrict(loc.district);
                    if (loc.state) setState(loc.state);
                  }}
                  placeholder="Type your village or click Use My Current Location..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Village / Town *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muradnagar"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ghaziabad"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uttar Pradesh"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Postal PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 201206"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full sm:w-1/3 p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Crop Details */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Primary Crop for Procurement * (मुख्य फसल)
                </label>
                <select
                  value={preferredCrop}
                  onChange={(e) => setPreferredCrop(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-[#0B2545] font-semibold"
                >
                  {crops.map((crop) => (
                    <option key={crop.name} value={crop.name}>
                      {crop.name} — MSP ₹{crop.msp_per_quintal} / Quintal ({crop.season})
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
                    min="0.5"
                    max="100"
                    required
                    value={landAcres}
                    onChange={(e) => setLandAcres(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Estimated Production Yield
                  </label>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>Approx. Yield:</span>
                    <span className="font-mono">~{(landAcres * 12).toFixed(1)} Quintals</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <p className="font-bold text-slate-800">MSP Procurement Assurance:</p>
                <p className="mt-0.5">
                  Selected crop is eligible for direct state procurement under official Minimum Support Price benchmarks.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Dynamic Mandi Selection (Requirement from Database) */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Select Preferred Procurement Mandi * (मंडी चयन)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Live operational mandis retrieved directly from the state procurement database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadCentres}
                  disabled={centresLoading}
                  className="text-xs text-[#0B2545] hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${centresLoading ? "animate-spin" : ""}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {/* Loading State */}
              {centresLoading && (
                <div className="p-8 border border-slate-200 rounded bg-slate-50 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
                  <p className="text-xs font-bold text-slate-700">Connecting to Mandi Database...</p>
                  <p className="text-[11px] text-slate-500">Fetching live wait times, capacity and active counters.</p>
                </div>
              )}

              {/* Error State with Actionable Retry */}
              {centresError && !centresLoading && (
                <div className="p-4 border border-red-300 rounded bg-red-50 text-xs text-red-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Unable to load procurement centres</p>
                      <p className="text-[11px] mt-0.5 text-red-700">{centresError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadCentres}
                    className="btn-gov-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold mt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              )}

              {/* Successful Dynamic List */}
              {!centresLoading && !centresError && centres.length > 0 && (
                <div className="space-y-2.5">
                  {centres.map((c) => {
                    const isSelected = preferredCentreId === c.id;
                    const isOpen = c.status === "OPEN";

                    return (
                      <label
                        key={c.id}
                        className={`block p-3.5 rounded border-2 transition cursor-pointer select-none ${
                          isSelected
                            ? "bg-blue-50 border-[#0B2545] shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="mandiCentre"
                              value={c.id}
                              checked={isSelected}
                              onChange={() => setPreferredCentreId(c.id)}
                              className="mt-0.5 text-[#0B2545] focus:ring-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-[#0B2545]">{c.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    isOpen
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {c.address} · {c.district}, {c.state}
                              </p>

                              <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-[#0B2545]" />
                                  <span>{c.active_counters} Counters Active</span>
                                </span>
                                <span>·</span>
                                <span>{c.current_waiting_count} Trolleys in Line</span>
                                <span>·</span>
                                <span className="text-emerald-700 font-bold">~{c.estimated_wait_min}m Est. Wait</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold font-mono text-[#0B2545] flex items-center gap-1 justify-end">
                              <Navigation className="w-3 h-3 text-slate-400" />
                              <span>{c.distance_km} km</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {c.open_time} – {c.close_time}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Aadhaar DBT linking and bank PFMS clearing account will sync automatically upon registration.
                </span>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setStep(step - 1);
                }}
                disabled={submitting}
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={submitting || (step === 3 && centresLoading)}
              className="btn-gov-primary text-xs py-2.5 px-6 flex items-center gap-1.5 font-bold shadow-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : step < 3 ? (
                <>
                  <span>Continue to Step {step + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Complete Mandi Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

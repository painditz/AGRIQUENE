"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api, CentreItem, CropItem } from "@/lib/api";
import {
  User, MapPin, Wheat, Building2, CheckCircle2,
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle,
  Clock, Activity, Sparkles, Navigation
} from "lucide-react";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State - Step 1: Personal KYC
  const [fullName, setFullName] = useState(
    user?.fullName && user.fullName !== "New Farmer" ? user.fullName : ""
  );
  const [farmerIdCard, setFarmerIdCard] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [farmerCoords, setFarmerCoords] = useState<{ lat: number; lng: number } | null>(null);

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
        setCentresError(t("noCentresAvailable"));
      } else {
        // Calculate distances if farmer coordinates are known
        let processedCentres = [...data];
        if (farmerCoords) {
          processedCentres = processedCentres.map((c) => {
            const rad = Math.PI / 180;
            const dLat = (c.latitude - farmerCoords.lat) * rad;
            const dLon = (c.longitude - farmerCoords.lng) * rad;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(farmerCoords.lat * rad) *
                Math.cos(c.latitude * rad) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return {
              ...c,
              distance_km: Math.round(dist * 10) / 10,
            };
          });
          processedCentres.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
        }

        setCentres(processedCentres);

        // Preselect matching district centre or first
        if (!preferredCentreId || !processedCentres.some((c) => c.id === preferredCentreId)) {
          const matched =
            processedCentres.find(
              (c) => c.district.toLowerCase() === district.toLowerCase()
            ) || processedCentres[0];
          setPreferredCentreId(matched.id);
        }
      }
    } catch (err: any) {
      setCentresError(t("unableToLoadCentres"));
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

  // Location Autocomplete callback
  const handleLocationSelected = (loc: SelectedLocation) => {
    if (loc.name) setVillage(loc.name);
    if (loc.district) setDistrict(loc.district);
    if (loc.state) setState(loc.state);
    if (loc.pin_code) setPinCode(loc.pin_code);
    if (loc.lat && loc.lng) {
      setFarmerCoords({ lat: loc.lat, lng: loc.lng });
    }
  };

  // Handle Step Advancement & Submission
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Step 1 Validation
    if (step === 1) {
      if (!fullName.trim()) {
        setFormError(t("errFullNameRequired"));
        return;
      }
      if (!village.trim() || !district.trim() || !state.trim()) {
        setFormError(t("errAddressRequired"));
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 Validation
    if (step === 2) {
      if (!preferredCrop) {
        setFormError(t("errCropRequired"));
        return;
      }
      if (landAcres <= 0) {
        setFormError(t("errLandRequired"));
        return;
      }
      setStep(3);
      return;
    }

    // Step 3 Submission
    if (step === 3) {
      if (!preferredCentreId) {
        setFormError(t("errMandiRequired"));
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

      setSuccessMsg(t("msgRegistrationSuccess"));
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
            {t("onboardingHeaderBadge")}
          </span>
          <h1 className="text-xl font-bold font-serif mt-0.5">
            {t("onboardingTitle")}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {t("onboardingStepOf")} {step} / 3:{" "}
            {step === 1
              ? t("onboardingStep1Label")
              : step === 2
              ? t("onboardingStep2Label")
              : t("onboardingStep3Label")}
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
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
            <span>{t("onboardingStep1Label")}</span>
          </button>

          <span className="text-slate-300">────</span>

          <button
            type="button"
            onClick={() => fullName.trim() && setStep(2)}
            disabled={step < 2 && !fullName.trim()}
            className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
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
            <span>{t("onboardingStep2Label")}</span>
          </button>

          <span className="text-slate-300">────</span>

          <button
            type="button"
            onClick={() => fullName.trim() && setStep(3)}
            disabled={step < 3 && !fullName.trim()}
            className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
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
            <span>{t("onboardingStep3Label")}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleNextStep} className="p-6 space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t("attentionRequired")}:</p>
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
                  {t("lblFullName")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("phFullName")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblFarmerIdCard")}
                    <span className="text-slate-400 font-normal lowercase ml-1">
                      {t("lblFarmerIdCardHint")}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("phFarmerIdCard")}
                    value={farmerIdCard}
                    onChange={(e) => setFarmerIdCard(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblFatherName")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("phFatherName")}
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded p-3 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-[#0B2545]">
                  {t("lblLocationSearchArea")}
                </label>
                <AddressAutocomplete
                  onLocationSelect={handleLocationSelected}
                  placeholder={t("phLocationSearch")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblVillage")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("phVillage")}
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblDistrict")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("phDistrict")}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblState")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("phState")}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t("lblPinCode")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder={t("phPinCode")}
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
                  {t("lblPrimaryCrop")}
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
                    {t("lblLandAcres")}
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
                    {t("lblEstimatedYield")}
                  </label>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>{t("approxYieldPrefix")}</span>
                    <span className="font-mono">~{(landAcres * 12).toFixed(1)} {lang === "hi" ? "क्विंटल" : "Quintals"}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <p className="font-bold text-slate-800">{t("mspAssuranceTitle")}:</p>
                <p className="mt-0.5">
                  {t("mspAssuranceDesc")}
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
                    {t("lblSelectPreferredMandi")}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {t("descMandiRetrieved")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadCentres}
                  disabled={centresLoading}
                  className="text-xs text-[#0B2545] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${centresLoading ? "animate-spin" : ""}`} />
                  <span>{t("btnRefreshList")}</span>
                </button>
              </div>

              {/* Loading State */}
              {centresLoading && (
                <div className="p-8 border border-slate-200 rounded bg-slate-50 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
                  <p className="text-xs font-bold text-slate-700">{t("connectingToMandiDb")}</p>
                  <p className="text-[11px] text-slate-500">{t("fetchingWaitTimes")}</p>
                </div>
              )}

              {/* Error State with Actionable Retry */}
              {centresError && !centresLoading && (
                <div className="p-4 border border-red-300 rounded bg-red-50 text-xs text-red-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{t("unableToLoadCentres")}</p>
                      <p className="text-[11px] mt-0.5 text-red-700">{centresError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadCentres}
                    className="btn-gov-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold mt-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t("btnRetryConnection")}</span>
                  </button>
                </div>
              )}

              {/* Successful Dynamic List */}
              {!centresLoading && !centresError && centres.length > 0 && (
                <div className="space-y-2.5">
                  {centres.map((c) => {
                    const isSelected = preferredCentreId === c.id;

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
                                <StatusBadge status={c.status} />
                              </div>

                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {c.address} · {c.district}, {c.state}
                              </p>

                              <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-[#0B2545]" />
                                  <span>{c.active_counters} {lang === "hi" ? "काउंटर सक्रिय" : "Counters Active"}</span>
                                </span>
                                <span>·</span>
                                <span>{c.current_waiting_count} {t("lblTrolleysInLine")}</span>
                                <span>·</span>
                                <span className="text-emerald-700 font-bold">~{c.estimated_wait_min}m {t("lblEstWaitMins")}</span>
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
                  {t("dbtNoticeText")}
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
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t("btnPrevious")}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={submitting || (step === 3 && centresLoading)}
              className="btn-gov-primary text-xs py-2.5 px-6 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("msgSavingProfile")}</span>
                </>
              ) : step === 1 ? (
                <>
                  <span>{t("btnNextCropAndLand")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : step === 2 ? (
                <>
                  <span>{t("btnNextPreferredMandi")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{t("btnCompleteRegistration")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

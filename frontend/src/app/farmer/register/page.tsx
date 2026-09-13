"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api, CentreItem, CropItem } from "@/lib/api";
import {
  User, MapPin, Wheat, Building2, CheckCircle2,
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle,
  Clock, Activity, Sparkles, Navigation, Search, X, Smartphone, Ticket
} from "lucide-react";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const { user, login, updateUser } = useAuth();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State - Step 1: Personal KYC
  const [fullName, setFullName] = useState(
    user?.fullName && user.fullName !== "New Farmer" ? user.fullName : ""
  );
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || "");
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

  // Form State - Step 3: Mandi Selection & Preferred Slot
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [centresLoading, setCentresLoading] = useState(false);
  const [centresError, setCentresError] = useState<string | null>(null);
  const [preferredCentreId, setPreferredCentreId] = useState<number | null>(null);
  const [mandiSearch, setMandiSearch] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("09:00 AM - 11:00 AM");
  const [generateTokenNow, setGenerateTokenNow] = useState(true);

  const slotOptions = [
    { value: "09:00 AM - 11:00 AM", label: "09:00 AM - 11:00 AM", badge: lang === "hi" ? "प्रातः स्लॉट" : "Morning Window" },
    { value: "11:00 AM - 01:00 PM", label: "11:00 AM - 01:00 PM", badge: lang === "hi" ? "दोपहर स्लॉट (अनुशंसित)" : "Midday (Recommended)" },
    { value: "02:00 PM - 04:00 PM", label: "02:00 PM - 04:00 PM", badge: lang === "hi" ? "अपराह्न स्लॉट" : "Afternoon Window" },
    { value: "04:00 PM - 06:00 PM", label: "04:00 PM - 06:00 PM", badge: lang === "hi" ? "संध्या स्लॉट" : "Evening Window" },
  ];

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
          if (prof.mobile_number) setMobileNumber(prof.mobile_number);
          if (prof.farmer_id_card) setFarmerIdCard(prof.farmer_id_card);
          if (prof.father_name) setFatherName(prof.father_name);
          if (prof.village) setVillage(prof.village);
          if (prof.district) setDistrict(prof.district);
          if (prof.state) setState(prof.state);
          if (prof.pin_code) setPinCode(prof.pin_code);
          if (prof.land_acres) setLandAcres(prof.land_acres);
          if (prof.preferred_crop) setPreferredCrop(prof.preferred_crop);
          if (prof.preferred_centre_id) setPreferredCentreId(prof.preferred_centre_id);
          if (prof.preferred_slot) setPreferredSlot(prof.preferred_slot);
        }
      } catch {
        if (user?.fullName && user.fullName !== "New Farmer") {
          setFullName(user.fullName);
        }
        if (user?.mobileNumber) {
          setMobileNumber(user.mobileNumber);
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

  useEffect(() => {
    if (step === 3 && centres.length === 0 && !centresLoading) {
      loadCentres();
    }
  }, [step]);

  // Dynamic filter for Mandi Search
  const filteredCentres = useMemo(() => {
    if (!mandiSearch.trim()) return centres;
    const q = mandiSearch.toLowerCase().trim();
    return centres.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [centres, mandiSearch]);

  const selectedCentreObj = useMemo(() => {
    return centres.find((c) => c.id === preferredCentreId) || null;
  }, [centres, preferredCentreId]);

  const handleLocationSelected = (loc: SelectedLocation) => {
    if (loc.name) setVillage(loc.name);
    if (loc.district) setDistrict(loc.district);
    if (loc.state) setState(loc.state);
    if (loc.pin_code) setPinCode(loc.pin_code);
    if (loc.lat && loc.lng) {
      setFarmerCoords({ lat: loc.lat, lng: loc.lng });
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Step 1 Validation
    if (step === 1) {
      if (!fullName.trim()) {
        setFormError(t("errFullNameRequired"));
        return;
      }
      const cleanMob = mobileNumber.replace(/\D/g, "");
      if (cleanMob.length < 10) {
        setFormError(t("errMobileRequired"));
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
        mobile_number: mobileNumber.trim(),
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
        preferred_slot: preferredSlot,
        generate_token: generateTokenNow,
      });

      // If response issued an access token, immediately log the user into the session
      if (response.access_token) {
        login({
          access_token: response.access_token,
          token_type: "bearer",
          user_id: response.user_id,
          full_name: response.full_name,
          mobile_number: response.mobile_number,
          role: "FARMER",
          is_registered: true,
          centre_id: response.preferred_centre_id ?? undefined,
          centre_name: response.preferred_centre_name ?? undefined,
        });
      } else if (updateUser) {
        updateUser({
          fullName: response.full_name,
          isRegistered: true,
          centreId: response.preferred_centre_id ?? undefined,
          centreName: response.preferred_centre_name ?? undefined,
        });
      }

      const tokenNotice = response.token_display
        ? (lang === "hi"
            ? `पंजीकरण पूर्ण! आपको टोकन ${response.token_display} आवंटित किया गया है।`
            : `Registration successful! Assigned Token ${response.token_display} at ${response.preferred_centre_name || "Mandi"}.`)
        : t("msgRegistrationSuccess");

      setSuccessMsg(tokenNotice);
      setTimeout(() => {
        router.push("/farmer/dashboard");
      }, 1500);
    } catch (err: any) {
      const msg = err.message || "Unable to complete registration. Please check your connection.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white border-2 border-[#0B2545] rounded-lg shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            {t("onboardingHeaderBadge")}
          </span>
          <h1 className="text-lg sm:text-xl font-bold font-serif mt-0.5">
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
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
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
        <form onSubmit={handleNextStep} className="p-4 sm:p-6 space-y-4">
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
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 rounded flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("lblMobileNumber")}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      placeholder={t("phMobileNumber")}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-11 p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                    />
                  </div>
                </div>
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

          {/* STEP 3: Searchable Mandi & Preferred Slot */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Top Header & Search Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    {t("lblSelectPreferredMandi")}
                  </label>
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

                {/* DYNAMIC SEARCH BAR AT TOP OF STEP 3 */}
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="w-4 h-4 text-[#0B2545]" />
                  </span>
                  <input
                    type="text"
                    value={mandiSearch}
                    onChange={(e) => setMandiSearch(e.target.value)}
                    placeholder={t("mandiSearchPlaceholder")}
                    className="w-full pl-9 pr-9 py-2 border-2 border-slate-300 rounded text-xs focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] outline-none"
                  />
                  {mandiSearch && (
                    <button
                      type="button"
                      onClick={() => setMandiSearch("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Mandi Active Banner */}
              {selectedCentreObj && (
                <div className="bg-blue-50 border-2 border-[#0B2545] rounded-md p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase shrink-0">
                      {t("lblSelectedMandi")}
                    </span>
                    <strong className="text-xs text-[#0B2545] font-bold truncate">
                      {selectedCentreObj.name}
                    </strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#0B2545] shrink-0">
                    {selectedCentreObj.distance_km != null ? `${selectedCentreObj.distance_km} km` : ""}
                  </span>
                </div>
              )}

              {/* Loading State */}
              {centresLoading && (
                <div className="p-6 border border-slate-200 rounded bg-slate-50 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0B2545]" />
                  <p className="text-xs font-bold text-slate-700">{t("connectingToMandiDb")}</p>
                  <p className="text-[11px] text-slate-500">{t("fetchingWaitTimes")}</p>
                </div>
              )}

              {/* Error State */}
              {centresError && !centresLoading && (
                <div className="p-3 border border-red-300 rounded bg-red-50 text-xs text-red-900 space-y-2">
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

              {/* Compact Filtered Mandi List (Requirement 2 & 10) */}
              {!centresLoading && !centresError && (
                <div className="max-h-56 sm:max-h-64 overflow-y-auto pr-1 space-y-2 border border-slate-200 rounded p-1.5 bg-slate-50/50">
                  {filteredCentres.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {t("noMandisFoundMatching")}
                    </div>
                  ) : (
                    filteredCentres.map((c) => {
                      const isSelected = preferredCentreId === c.id;

                      return (
                        <label
                          key={c.id}
                          className={`block p-2.5 rounded border transition cursor-pointer select-none ${
                            isSelected
                              ? "bg-white border-[#0B2545] shadow-xs ring-1 ring-[#0B2545]"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name="mandiCentre"
                                value={c.id}
                                checked={isSelected}
                                onChange={() => setPreferredCentreId(c.id)}
                                className="mt-0.5 text-[#0B2545] focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-[#0B2545]">{c.name}</span>
                                  <StatusBadge status={c.status} />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {c.address} · {c.district}, {c.state}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono mt-1 flex-wrap">
                                  <span>{c.active_counters} {lang === "hi" ? "काउंटर" : "Counters"}</span>
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
                    })
                  )}
                </div>
              )}

              {/* Preferred Slot Allotment (Requirement 3 & 5) */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B2545]" />
                  <span>{t("lblPreferredSlot")}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {slotOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition ${
                        preferredSlot === opt.value
                          ? "bg-blue-50 border-[#0B2545] font-bold text-[#0B2545]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="preferredSlot"
                          value={opt.value}
                          checked={preferredSlot === opt.value}
                          onChange={() => setPreferredSlot(opt.value)}
                          className="text-[#0B2545] focus:ring-0"
                        />
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">{opt.badge}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    id="genToken"
                    checked={generateTokenNow}
                    onChange={(e) => setGenerateTokenNow(e.target.checked)}
                    className="rounded text-[#0B2545] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="genToken" className="text-slate-700 font-semibold cursor-pointer select-none">
                    {t("lblGenerateTokenNow")}
                  </label>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{t("dbtNoticeText")}</span>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
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

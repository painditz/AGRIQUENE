"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import {
  User, MapPin, CheckCircle2, AlertCircle, RefreshCw,
  Smartphone, Building2, CreditCard, ArrowRight, ShieldCheck, Landmark
} from "lucide-react";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { LeafletMandiMap } from "@/components/map/LeafletMandiMap";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const { user, login, updateUser } = useAuth();
  const { t, lang } = useLanguage();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State: Personal KYC Details Only
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [farmerIdCard, setFarmerIdCard] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [farmerCoords, setFarmerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [landAcres, setLandAcres] = useState<number>(2.5);

  // Bank & DBT Details (Personal Financial KYC)
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // Prepopulate from existing profile ONLY if explicitly in edit mode (?edit=true)
  useEffect(() => {
    let isMounted = true;
    const isEditMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "true";
    if (!isEditMode) {
      return;
    }

    const loadProfile = async () => {
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
          if (prof.bank_name) setBankName(prof.bank_name);
          if (prof.ifsc_code) setIfscCode(prof.ifsc_code);
          if (prof.latitude && prof.longitude) {
            setFarmerCoords({ lat: prof.latitude, lng: prof.longitude });
          }
        }
      } catch {
        if (user?.fullName && user.fullName !== "New Farmer") {
          setFullName(user.fullName);
        }
        if (user?.mobileNumber) {
          setMobileNumber(user.mobileNumber);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLocationSelected = (loc: SelectedLocation) => {
    if (loc.name) setVillage(loc.name);
    if (loc.district) setDistrict(loc.district);
    if (loc.state) setState(loc.state);
    if (loc.pin_code) setPinCode(loc.pin_code);
    if (loc.lat && loc.lng) {
      setFarmerCoords({ lat: loc.lat, lng: loc.lng });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Personal Details Validation
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

    setSubmitting(true);
    try {
      const response = await api.registerFarmerProfile({
        full_name: fullName.trim(),
        mobile_number: cleanMob,
        farmer_id_card: farmerIdCard.trim() || undefined,
        father_name: fatherName.trim() || undefined,
        address: `${village.trim()}, ${district.trim()}, ${state.trim()}`,
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        pin_code: pinCode.trim() || undefined,
        land_acres: Number(landAcres) || 2.5,
        bank_name: bankName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        ifsc_code: ifscCode.trim() || undefined,
        latitude: farmerCoords?.lat,
        longitude: farmerCoords?.lng,
        selected_location: village ? `${village.trim()}, ${district.trim()}` : undefined,
        generate_token: false,
      });

      // Update session if token was issued
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
          farmer_id: response.id,
          farmer_id_card: response.farmer_id_card ?? undefined,
        });
      } else if (updateUser) {
        updateUser({
          fullName: response.full_name,
          farmerId: response.id,
          farmerIdCard: response.farmer_id_card ?? undefined,
          isRegistered: true,
        });
      }

      const welcomeMsg = lang === "hi"
        ? "व्यक्तिगत पंजीकरण पूर्ण हुआ! किसान पोर्टल पर आपका स्वागत है।"
        : "Personal registration completed successfully! Welcome to AGRIQUENE Farmer Portal.";

      setSuccessMsg(welcomeMsg);
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
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white border-2 border-[#0B2545] rounded-lg shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 border-b-2 border-[#B91C1C]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("onboardingHeaderBadge")}</span>
            </span>
            <span className="text-[10px] bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded border border-blue-700">
              Personal KYC Only
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-serif mt-1">
            {lang === "hi" ? "किसान पंजीकरण एवं व्यक्तिगत सत्यापन" : "Farmer Registration & KYC Verification"}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {lang === "hi"
              ? "किसान पोर्टल में प्रवेश हेतु अपना व्यक्तिगत एवं कृषि विवरण दर्ज करें। मंडी व स्लॉट चयन पोर्टल के अंदर होगा।"
              : "Enter your personal details to register. Mandi and slot allotment will be selected inside the Farmer Portal."}
          </p>
        </div>

        {/* Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-900">
          <span className="text-sm">ℹ️</span>
          <span>
            {lang === "hi"
              ? "पंजीकरण के बाद आप पोर्टल में अपनी पसंद की मंडी, फसल और समय स्लॉट चुनकर टोकन प्राप्त कर सकते हैं।"
              : "After completing your personal registration, you can book your preferred Mandi, Crop produce, and Time Slot in the portal."}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-6 space-y-5">
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

          {/* SECTION 1: Personal KYC Details */}
          <div className="space-y-3.5">
            <div className="border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-[#0B2545]">
              <User className="w-3.5 h-3.5" />
              <span>1. {lang === "hi" ? "व्यक्तिगत पहचान (Personal KYC)" : "Personal Identification & KYC"}</span>
            </div>

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
          </div>

          {/* SECTION 2: Location & Address */}
          <div className="space-y-3.5 pt-2">
            <div className="border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-[#0B2545]">
              <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
              <span>2. {lang === "hi" ? "निवास व खेत का पता" : "Farm Location & Address"}</span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded p-3 space-y-2">
              <label className="block text-[11px] font-bold uppercase text-[#0B2545]">
                {t("lblLocationSearchArea")}
              </label>
              <AddressAutocomplete
                onLocationSelect={handleLocationSelected}
                placeholder={t("phLocationSearch")}
              />
              <div className="rounded overflow-hidden border border-slate-300 mt-2">
                <LeafletMandiMap
                  centres={[]}
                  farmerLocation={farmerCoords ? {
                    lat: farmerCoords.lat,
                    lng: farmerCoords.lng,
                    name: village ? `${village}, ${district}` : "Your Farm Location"
                  } : null}
                  height="220px"
                />
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t("lblLandAcres")}
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={500}
                  step={0.1}
                  value={landAcres}
                  onChange={(e) => setLandAcres(parseFloat(e.target.value) || 2.5)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Direct Benefit Transfer (DBT) Bank Details */}
          <div className="space-y-3 pt-2">
            <div className="border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-[#0B2545]">
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. {lang === "hi" ? "डीबीटी बैंक खाता विवरण (वैकल्पिक)" : "Direct Benefit Transfer (DBT) Bank Account (Optional)"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {lang === "hi" ? "बैंक का नाम" : "Bank Name"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {lang === "hi" ? "खाता संख्या" : "Account Number"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30891234567"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {lang === "hi" ? "आईएफएससी कोड" : "IFSC Code"}
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="e.g. SBIN0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono uppercase outline-none focus:border-[#0B2545]"
                />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{t("dbtNoticeText")}</span>
            </div>
          </div>

          {/* Submission Action */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/farmer/login"
              className="text-xs text-slate-600 hover:text-[#0B2545] font-semibold underline"
            >
              {lang === "hi" ? "पहले से पंजीकृत हैं? यहाँ लॉगिन करें" : "Already registered? Login here"}
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto btn-gov-primary text-xs py-2.5 px-7 flex items-center justify-center gap-2 font-bold shadow-md cursor-pointer min-h-[44px]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("msgSavingProfile")}</span>
                </>
              ) : (
                <>
                  <span>{lang === "hi" ? "पंजीकरण पूर्ण करें व पोर्टल में प्रवेश करें" : "Complete Registration & Enter Portal"}</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

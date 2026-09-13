"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem, SlotItem, TokenItem, CropItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ChangeMandiModal } from "@/components/mandi/ChangeMandiModal";
import { LeafletMandiMap, FarmerLocation } from "@/components/map/LeafletMandiMap";
import {
  CalendarPlus, Building2, Wheat, Scale, Calendar,
  Clock, CheckCircle2, Ticket, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Sparkles, MapPin, Search, X
} from "lucide-react";

function BookSlotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const preselectedCentre = searchParams.get("centre");

  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(preselectedCentre ? parseInt(preselectedCentre) : null);
  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(null);
  const [showMandiModal, setShowMandiModal] = useState(false);
  const [mandiSearchQuery, setMandiSearchQuery] = useState("");
  const [crops, setCrops] = useState<CropItem[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(45.0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const searchedCentres = useMemo(() => {
    const q = mandiSearchQuery.trim().toLowerCase();
    if (!q) return centres;
    return centres.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [centres, mandiSearchQuery]);

  const [bookingStep, setBookingStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<TokenItem | null>(null);

  // Load Centres & Crops from backend database
  useEffect(() => {
    // Attempt safe browser geolocation if permitted (falls back gracefully)
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFarmerLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: user?.fullName || "Your Current Location",
          });
        },
        () => {
          // Permission denied or unavailable: Map cleanly displays all mandis
        },
        { timeout: 8000, maximumAge: 300000 }
      );
    }

    async function fetchCentresAndCrops() {
      try {
        const [centresData, cropsData] = await Promise.all([
          api.getCentres(),
          api.getCrops(),
        ]);
        setCentres(centresData);
        let chosenId: number | null = null;
        if (preselectedCentre) {
          chosenId = parseInt(preselectedCentre);
        } else if (user?.centreId) {
          chosenId = user.centreId;
        } else {
          const prof = await api.getFarmerProfile().catch(() => null);
          if (prof?.preferred_centre_id) {
            chosenId = prof.preferred_centre_id;
          }
        }
        if (chosenId) {
          setSelectedCentreId(chosenId);
        }
        setCrops(cropsData);
        if (cropsData.length > 0) {
          setSelectedCrop((prev) => prev || cropsData[0].name);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    fetchCentresAndCrops();

    const handleMandiChanged = (e: any) => {
      if (e?.detail?.id) {
        setSelectedCentreId(e.detail.id);
      }
    };
    window.addEventListener("mandi-changed", handleMandiChanged);
    return () => window.removeEventListener("mandi-changed", handleMandiChanged);
  }, [preselectedCentre, user?.centreId]);

  // Load Slots when centre or date changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedCentreId) return;
      try {
        const data = await api.getCentreSlots(selectedCentreId, selectedDate);
        setSlots(data);
        const rec = data.find((s) => s.is_recommended && s.available_count > 0);
        if (rec) {
          setSelectedSlotId(rec.id);
        } else if (data.length > 0) {
          setSelectedSlotId(data[0].id);
        }
      } catch {}
    }
    fetchSlots();
  }, [selectedCentreId, selectedDate]);

  const handleConfirmBooking = async () => {
    if (!selectedCentreId || !selectedSlotId) {
      setError("Please select a mandi and a time slot.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createBooking({
        centre_id: selectedCentreId,
        slot_id: selectedSlotId,
        crop_type: selectedCrop,
        estimated_quantity_quintals: quantity,
      });
      setGeneratedToken(res);
      setBookingStep(4); // Move to Success Token Screen
      showToast(
        `Token ${res.token_display} assigned successfully! Position #${res.current_position}`,
        "success",
        "Slot Confirmed"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm booking.";
      setError(msg);
      showToast(msg, "error", "Booking Error");
    } finally {
      setLoading(false);
    }
  };

  const selectedCentreObj = centres.find((c) => c.id === selectedCentreId) || centres[0];
  const selectedSlotObj = slots.find((s) => s.id === selectedSlotId);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            PROCUREMENT APPOINTMENT SCHEDULER
          </span>
          <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
            {t("bookSlotTitle")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select Mandi, specify crop quantity, and pick an AI-recommended workload time window.
          </p>
        </div>

        {/* Step Indicator */}
        {bookingStep < 4 && (
          <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between text-xs overflow-x-auto gap-2">
            <span className={`font-bold flex items-center gap-1.5 whitespace-nowrap ${bookingStep === 1 ? "text-[#0B2545] bg-blue-50 px-2 py-1 rounded" : "text-slate-500"}`}>
              <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white inline-flex items-center justify-center text-[10px]">1</span>
              {t("stepCrop")} & Mandi
            </span>
            <span className="text-slate-300">───</span>
            <span className={`font-bold flex items-center gap-1.5 whitespace-nowrap ${bookingStep === 2 ? "text-[#0B2545] bg-blue-50 px-2 py-1 rounded" : "text-slate-500"}`}>
              <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white inline-flex items-center justify-center text-[10px]">2</span>
              {t("stepDate")} & {t("stepSlot")}
            </span>
            <span className="text-slate-300">───</span>
            <span className={`font-bold flex items-center gap-1.5 whitespace-nowrap ${bookingStep === 3 ? "text-[#0B2545] bg-blue-50 px-2 py-1 rounded" : "text-slate-500"}`}>
              <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white inline-flex items-center justify-center text-[10px]">3</span>
              {t("stepConfirm")}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs p-3.5 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Centre & Crop */}
        {bookingStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-6 shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  1. Procurement Centre (Mandi)
                </label>
                <button
                  type="button"
                  onClick={() => setShowMandiModal(true)}
                  className="text-xs text-[#0B2545] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Browse All Mandis</span>
                </button>
              </div>

              {/* Quick Search Bar to quickly search/select a Mandi */}
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Quick search Mandi by name, district, or city (e.g. Ghaziabad, Hapur, Meerut)..."
                    value={mandiSearchQuery}
                    onChange={(e) => setMandiSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-md text-xs outline-none focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] bg-white shadow-xs"
                  />
                  {mandiSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMandiSearchQuery("")}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Instant Search Results Dropdown */}
                {mandiSearchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {searchedCentres.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        No procurement centres match "{mandiSearchQuery}"
                      </div>
                    ) : (
                      searchedCentres.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCentreId(c.id);
                            setMandiSearchQuery("");
                            showToast(`Selected Mandi: ${c.name}`, "info");
                          }}
                          className={`p-3 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between transition ${
                            selectedCentreId === c.id ? "bg-blue-50/90 font-bold text-[#0B2545]" : "text-slate-800"
                          }`}
                        >
                          <div>
                            <p className="font-bold">{c.name}</p>
                            <p className="text-[11px] text-slate-500">{c.address} · {c.district}, {c.state}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {c.current_waiting_count} waiting
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {centres.find((c) => c.id === selectedCentreId) ? (
                (() => {
                  const c = centres.find((x) => x.id === selectedCentreId)!;
                  return (
                    <div className="bg-blue-50/70 border-2 border-[#0B2545] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[#0B2545]">{c.name}</h4>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0" />
                          <span>{c.address} · {c.district}, {c.state}</span>
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium pt-1">
                          <span>Line: <strong>{c.current_waiting_count} waiting</strong></span>
                          <span>·</span>
                          <span>Wait: <strong>~{c.estimated_wait_min}m</strong></span>
                          <span>·</span>
                          <span>Gate: <strong>{c.open_time} – {c.close_time}</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowMandiModal(true)}
                        className="btn-gov-outline text-xs py-2 px-3.5 font-bold flex-shrink-0 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Change Mandi</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMandiModal(true)}
                  className="w-full border-2 border-dashed border-slate-300 rounded-md p-5 text-center text-xs font-bold text-[#0B2545] hover:bg-slate-50 cursor-pointer"
                >
                  + Click to choose your Procurement Centre (Mandi)
                </button>
              )}
            </div>

                        {/* Interactive Mandi Radar & Navigation Map (Restored) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0B2545]" />
                  <span>{t("interactiveMapTitle")}</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">{t("clickPinToSelect")}</span>
              </div>
              <LeafletMandiMap
                centres={searchedCentres.length > 0 ? searchedCentres : centres}
                farmerLocation={farmerLocation}
                selectedCentreId={selectedCentreId}
                onSelectCentre={(centre) => {
                  setSelectedCentreId(centre.id);
                  showToast(`Selected Mandi: ${centre.name}`, "info");
                }}
                height="380px"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  2. Select Crop Type
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-[#0B2545] min-h-[44px]"
                >
                  {crops.map((crp) => (
                    <option key={crp.name} value={crp.name}>
                      {crp.name} — MSP ₹{crp.msp_per_quintal} / Qtl ({crp.season})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  3. {t("estimatedQuantity")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={0.5}
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 10)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545] min-h-[44px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  1 Quintal = 100 Kilograms (~{(quantity * 100).toFixed(0)} kg produce total)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setBookingStep(2)}
                className="btn-gov-primary text-xs py-2.5 px-6 font-bold flex items-center gap-1.5 min-h-[44px]"
              >
                <span>Proceed to Slot Selection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Date & Slot */}
        {bookingStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Select Procurement Date
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Today", val: new Date().toISOString().split("T")[0] },
                  {
                    label: "Tomorrow",
                    val: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                  },
                  {
                    label: "Day After",
                    val: new Date(Date.now() + 172800000).toISOString().split("T")[0],
                  },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setSelectedDate(d.val)}
                    className={`p-3 rounded border text-xs text-center font-bold transition min-h-[44px] ${
                      selectedDate === d.val
                        ? "bg-[#0B2545] text-white border-[#0B2545] shadow-sm"
                        : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p>{d.label}</p>
                    <p className="text-[10px] font-mono mt-0.5 opacity-80">{d.val}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Available Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Available Time Slots ({selectedCentreObj?.name})
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>AI Recommended for Shortest Wait</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isFull = slot.available_count <= 0;
                  const isSelected = selectedSlotId === slot.id;
                  const isLimited = slot.available_count > 0 && slot.available_count <= 5;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => !isFull && setSelectedSlotId(slot.id)}
                      className={`p-3.5 rounded-md border text-xs transition relative min-h-[44px] ${
                        isFull
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                          : isSelected
                          ? "bg-blue-50 border-2 border-[#0B2545] text-[#0B2545] cursor-pointer ring-1 ring-blue-300 shadow-sm"
                          : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 cursor-pointer"
                      }`}
                    >
                      {slot.is_recommended && (
                        <span className="absolute -top-2 right-2 bg-emerald-700 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          ★ {t("recommendedSlot")}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-mono">
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isFull
                              ? "bg-rose-100 text-rose-800"
                              : isLimited
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isFull ? t("slotFull") : isLimited ? t("slotLimited") : t("slotAvailable")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <span>Remaining Capacity:</span>
                        <strong className={isFull ? "text-rose-600" : isLimited ? "text-amber-700" : "text-emerald-700"}>
                          {isFull ? "0 slots left" : `${slot.available_count} slots left`}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBookingStep(1)}
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!selectedSlotId}
                onClick={() => setBookingStep(3)}
                className="btn-gov-primary text-xs py-2.5 px-6 font-bold flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Final Confirmation */}
        {bookingStep === 3 && (
          <div className="bg-white border border-slate-200 rounded-md p-5 sm:p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-[#0B2545] border-b pb-2">
              {t("confirmBookingPrompt")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Procurement Centre:</p>
                <p className="font-bold text-[#0B2545] text-sm mt-0.5">{selectedCentreObj?.name}</p>
                <p className="text-slate-600 mt-0.5">{selectedCentreObj?.address}</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Crop Produce:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedCrop}</p>
                <p className="text-slate-600 mt-0.5">Estimated Volume: <strong>{quantity} Quintals</strong></p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-slate-500 font-medium">Scheduled Date:</p>
                <p className="font-bold text-slate-800 font-mono mt-0.5">{selectedDate}</p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-slate-500 font-medium">Appointment Window:</p>
                <p className="font-bold text-[#B91C1C] font-mono text-sm mt-0.5">
                  {selectedSlotObj?.start_time} – {selectedSlotObj?.end_time}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-md text-xs text-blue-900 space-y-1">
              <p className="font-bold">Important Mandi Gate Instructions:</p>
              <p>• Your AI-sequenced queue token will be created immediately upon confirmation.</p>
              <p>• Please bring original Farmer ID / Aadhaar Card and vehicle RC for weighbridge entry.</p>
              <p>• Free real-time SMS departure alerts will be sent to your registered PM-KISAN mobile number.</p>
            </div>

            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBookingStep(2)}
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Slot</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmBooking}
                className="btn-gov-red text-xs py-2.5 px-8 font-bold flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Confirm Booking & Generate Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Token Generation Success Card (Requirement 14) */}
        {bookingStep === 4 && generatedToken && (
          <div className="bg-white border-2 border-[#0B2545] rounded-md shadow-xl overflow-hidden">
            <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                {t("bookingSuccess")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-serif mt-1">
                Your Token: {generatedToken.token_display}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Ref: {generatedToken.booking_reference} · {generatedToken.centre_name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Prominent Token Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">
                    Procurement Centre
                  </p>
                  <p className="font-bold text-[#0B2545] text-sm mt-0.5">
                    {generatedToken.centre_name}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Date: <strong className="font-mono">{generatedToken.booking_date}</strong> ({generatedToken.slot_time})
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">
                    Produce Volume
                  </p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {generatedToken.crop_type}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Quantity: <strong>{generatedToken.quantity_quintals} Quintals</strong>
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-slate-500 font-bold uppercase text-[10px]">
                    Initial Queue Position
                  </p>
                  <p className="text-2xl font-black text-[#0B2545] font-mono mt-0.5">
                    #{generatedToken.current_position}
                  </p>
                  <p className="text-xs text-amber-800 font-semibold">
                    ~{generatedToken.predicted_wait_minutes} min estimated wait
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/farmer/queue"
                  className="btn-gov-primary flex-1 text-center text-xs py-2.5 font-bold min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <Ticket className="w-4 h-4" />
                  <span>{t("viewMyQueue")}</span>
                </Link>
                <Link
                  href="/farmer/dashboard"
                  className="btn-gov-outline flex-1 text-center text-xs py-2.5 font-bold min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <span>Farmer Dashboard</span>
                </Link>
                <Link
                  href="/farmer/centres"
                  className="btn-gov-outline flex-1 text-center text-xs py-2.5 font-bold min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-[#B91C1C]" />
                  <span>{t("getDirections")}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        <ChangeMandiModal
          isOpen={showMandiModal}
          onClose={() => setShowMandiModal(false)}
          currentSelectedId={selectedCentreId}
          onSelectCentre={(c) => {
            setSelectedCentreId(c.id);
          }}
        />
      </div>
    </FarmerLayout>
  );
}

export default function FarmerBookSlotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading procurement scheduler...</div>}>
      <BookSlotContent />
    </Suspense>
  );
}


"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem, SlotItem, TokenItem } from "@/lib/api";
import { CROPS_MASTER } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ETACard } from "@/components/ui/ETACard";
import {
  CalendarPlus, Building2, Wheat, Scale, Calendar,
  Clock, CheckCircle2, Ticket, ArrowRight, ArrowLeft, RefreshCw, AlertCircle
} from "lucide-react";

function BookSlotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedCentre = searchParams.get("centre");

  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number>(preselectedCentre ? parseInt(preselectedCentre) : 1);
  const [crops] = useState(CROPS_MASTER);
  const [selectedCrop, setSelectedCrop] = useState("Wheat (Sharbati/Kalyansona)");
  const [quantity, setQuantity] = useState<number>(45.0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const [bookingStep, setBookingStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<TokenItem | null>(null);

  // Load Centres
  useEffect(() => {
    async function fetchCentres() {
      try {
        const data = await api.getCentres();
        setCentres(data);
      } catch {}
    }
    fetchCentres();
  }, []);

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
    if (!selectedSlotId) {
      setError("Please select a time slot.");
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
    } catch (err: any) {
      setError(err.message || "Failed to confirm booking.");
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
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            PROCUREMENT APPOINTMENT SCHEDULER
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Book Procurement Slot
          </h1>
          <p className="text-xs text-slate-500">
            Select Mandi, specify crop quantity, and pick a workload-recommended time slot.
          </p>
        </div>

        {/* Step Indicator */}
        {bookingStep < 4 && (
          <div className="bg-slate-100 p-3 rounded border border-slate-200 flex items-center justify-between text-xs">
            <span className={`font-bold ${bookingStep === 1 ? "text-[#0B2545]" : "text-slate-500"}`}>
              1. Centre & Crop
            </span>
            <span className="text-slate-300">───</span>
            <span className={`font-bold ${bookingStep === 2 ? "text-[#0B2545]" : "text-slate-500"}`}>
              2. Slot Selection
            </span>
            <span className="text-slate-300">───</span>
            <span className={`font-bold ${bookingStep === 3 ? "text-[#0B2545]" : "text-slate-500"}`}>
              3. Review & Confirm
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Centre & Crop */}
        {bookingStep === 1 && (
          <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Step 1: Choose Procurement Centre (Mandi)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {centres.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-start justify-between p-3.5 rounded border text-xs cursor-pointer transition ${
                      selectedCentreId === c.id
                        ? "bg-blue-50 border-2 border-[#0B2545] text-[#0B2545] font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="centre"
                        checked={selectedCentreId === c.id}
                        onChange={() => setSelectedCentreId(c.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-bold">{c.name}</p>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {c.district}, {c.state} (~{c.distance_km} km)
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1 font-mono">
                          Queue: <strong className="text-[#0B2545]">{c.current_waiting_count}</strong> | Est. Wait: <strong className="text-[#B91C1C]">{c.estimated_wait_min} min</strong>
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Step 2: Select Crop Type
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-[#0B2545]"
                >
                  {crops.map((crp) => (
                    <option key={crp.name} value={crp.name}>
                      {crp.name} — MSP ₹{crp.msp} / Qtl ({crp.season})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Step 3: Estimated Quantity (in Quintals)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={0.5}
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 10)}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  1 Quintal = 100 Kilograms (~{(quantity * 100).toFixed(0)} kg total)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setBookingStep(2)}
                className="btn-gov-primary text-xs py-2.5 px-6 font-bold flex items-center gap-1.5"
              >
                <span>Proceed to Slot Selection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Date & Slot */}
        {bookingStep === 2 && (
          <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Select Procurement Date
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                    className={`p-3 rounded border text-xs text-center font-bold transition ${
                      selectedDate === d.val
                        ? "bg-[#0B2545] text-white border-[#0B2545]"
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
                <span className="text-[11px] text-emerald-700 font-semibold">
                  ★ Recommended based on workload
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isFull = slot.available_count <= 0;
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => !isFull && setSelectedSlotId(slot.id)}
                      className={`p-3.5 rounded border text-xs transition relative ${
                        isFull
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                          : isSelected
                          ? "bg-blue-50 border-2 border-[#0B2545] text-[#0B2545] cursor-pointer ring-1 ring-blue-300"
                          : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 cursor-pointer"
                      }`}
                    >
                      {slot.is_recommended && (
                        <span className="absolute -top-2 right-2 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                          ★ Recommended
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-mono">
                          {slot.start_time} – {slot.end_time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <span>Capacity:</span>
                        <strong className={isFull ? "text-red-600" : "text-emerald-700"}>
                          {isFull ? "Full (0 slots left)" : `${slot.available_count} slots left`}
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
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!selectedSlotId}
                onClick={() => setBookingStep(3)}
                className="btn-gov-primary text-xs py-2.5 px-6 font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Final Confirmation */}
        {bookingStep === 3 && (
          <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-[#0B2545] border-b pb-2">
              Review Appointment Booking Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Procurement Centre:</p>
                <p className="font-bold text-[#0B2545] text-sm mt-0.5">{selectedCentreObj?.name}</p>
                <p className="text-slate-600 mt-0.5">{selectedCentreObj?.address}</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Crop Produce:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedCrop}</p>
                <p className="text-slate-600 mt-0.5">Quantity: <strong>{quantity} Quintals</strong></p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-slate-500 font-medium">Scheduled Date:</p>
                <p className="font-bold text-slate-800 font-mono mt-0.5">{selectedDate}</p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-slate-500 font-medium">Appointment Slot Window:</p>
                <p className="font-bold text-[#B91C1C] font-mono text-sm mt-0.5">
                  {selectedSlotObj?.start_time} – {selectedSlotObj?.end_time}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded text-xs text-blue-900 space-y-1">
              <p className="font-bold">Important Mandi Gate Instructions:</p>
              <p>• Digital token number will be generated immediately on confirmation.</p>
              <p>• Please bring original Farmer ID / Aadhaar Card and vehicle RC for weighbridge entry.</p>
              <p>• Automated SMS alert will be dispatched to your registered mobile number.</p>
            </div>

            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBookingStep(2)}
                className="btn-gov-outline text-xs py-2 px-4 flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Slot</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmBooking}
                className="btn-gov-red text-xs py-2.5 px-8 font-bold flex items-center gap-2 disabled:opacity-50"
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
          <div className="bg-white border-2 border-[#0B2545] rounded shadow-xl overflow-hidden">
            <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                BOOKING CONFIRMED & TOKEN GENERATED
              </span>
              <h2 className="text-2xl font-black font-serif mt-1">
                Your Token: {generatedToken.token_display}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Ref: {generatedToken.booking_reference} · {generatedToken.centre_name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Prominent Token Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
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
                  className="btn-gov-primary flex-1 text-center text-xs py-2.5 font-bold"
                >
                  Track Live Queue Position
                </Link>
                <Link
                  href="/farmer/dashboard"
                  className="btn-gov-outline flex-1 text-center text-xs py-2.5 font-bold"
                >
                  View Farmer Dashboard
                </Link>
                <Link
                  href="/farmer/centres"
                  className="btn-gov-outline flex-1 text-center text-xs py-2.5 font-bold"
                >
                  Get Mandi Directions
                </Link>
              </div>
            </div>
          </div>
        )}
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

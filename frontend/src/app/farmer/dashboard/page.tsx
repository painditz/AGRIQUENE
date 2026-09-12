"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { ETACard } from "@/components/ui/ETACard";
import { DepartureAdvisory } from "@/components/ui/DepartureAdvisory";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QueueVisualizer } from "@/components/ui/QueueVisualizer";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { api, TokenItem, CentreQueueStatus } from "@/lib/api";
import {
  CalendarPlus, Activity, FileText, ArrowRight,
  MapPin, Clock, Scale, CreditCard, RefreshCw, AlertCircle, CheckCircle2
} from "lucide-react";

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { lastEvent } = useQueueSocket();

  const [token, setToken] = useState<TokenItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const tokenData = await api.getFarmerCurrentToken();
      if (tokenData) {
        setToken(tokenData);
        const qData = await api.getCentreQueue(tokenData.centre_id);
        setQueueStatus(qData);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When WebSocket fires an event, immediately sync data
  useEffect(() => {
    if (lastEvent) {
      loadData();
    }
  }, [lastEvent]);

  const farmerName = user?.fullName || "Ramesh Kumar Sharma";

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Welcome Salutation Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              PM-KISAN LINKED ACCOUNT
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              {t("welcome")}, {farmerName}
            </h1>
            <p className="text-xs text-slate-500">
              Farmer ID: <span className="font-mono font-bold text-slate-700">PMK-UP-2026-9481</span> · District: Ghaziabad, UP
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/farmer/book"
              className="btn-gov-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Book New Slot</span>
            </Link>
          </div>
        </div>

        {/* Hero: Active Procurement Token & AI ETA Card (Requirement 9) */}
        {token ? (
          <div className="space-y-5">
            {/* CURRENT PROCUREMENT BANNER */}
            <div className="bg-white border-2 border-[#0B2545] rounded shadow-md overflow-hidden">
              <div className="bg-[#0B2545] text-white px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse" />
                  <span className="font-black text-xs uppercase tracking-wider">
                    {t("activeProcurement")}
                  </span>
                </div>
                <StatusBadge status={token.status} />
              </div>

              <div className="p-5 space-y-4">
                {/* Mandi & Token Meta Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Procurement Centre
                    </p>
                    <p className="text-sm font-bold text-[#0B2545] mt-0.5">
                      {token.centre_name}
                    </p>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>Grand Trunk Road Yard (~2.4 km)</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Produce & Scheduled Slot
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {token.crop_type} ({token.quantity_quintals} Qtl)
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Date: <strong className="font-mono">{token.booking_date}</strong> ({token.slot_time})
                    </p>
                  </div>

                  <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded border sm:border-0 border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Your Token Number
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-[#0B2545] font-mono tracking-tight mt-0.5">
                      {token.token_display}
                    </p>
                    <p className="text-xs font-bold text-amber-700">
                      Queue Position: #{token.current_position}
                    </p>
                  </div>
                </div>

                {/* Prominent AI ETA Component */}
                <ETACard
                  waitMinutes={token.predicted_wait_minutes}
                  expectedTurnTime={token.expected_turn_time}
                  isDemoPrediction={false}
                  modelVersion="XGBoost-v1.0"
                  confidenceScore={0.94}
                  onRefresh={loadData}
                  isLoading={loading}
                />

                {/* "When Should I Leave?" Feature (Requirement 15) */}
                <DepartureAdvisory
                  expectedTurnTime={token.expected_turn_time}
                  waitMinutes={token.predicted_wait_minutes}
                  recommendedDepartureTime={token.recommended_departure_time}
                  departureAdvice={token.departure_advice}
                  urgency={token.predicted_wait_minutes <= 20 ? "high" : "normal"}
                  travelTimeMin={25}
                />

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href="/farmer/queue"
                    className="btn-gov-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <Activity className="w-4 h-4" />
                    <span>View Dedicated Live Queue Screen</span>
                  </Link>

                  <Link
                    href="/farmer/centres"
                    className="btn-gov-outline text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <MapPin className="w-4 h-4 text-[#B91C1C]" />
                    <span>Get Mandi Gate Directions</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Visual Token Progression Chain Preview */}
            {queueStatus && (
              <QueueVisualizer
                queue={queueStatus.queue}
                userTokenDisplay={token.token_display}
                servingTokenDisplay={queueStatus.current_serving_token || "#114"}
                currentPosition={token.current_position}
              />
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-[#0B2545] rounded-full flex items-center justify-center mx-auto">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0B2545]">
                No Active Procurement Booking
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You do not have an upcoming appointment scheduled. Choose a nearby mandi and book your slot now.
              </p>
            </div>
            <Link
              href="/farmer/book"
              className="btn-gov-primary text-xs py-2 px-5 inline-flex items-center gap-2 font-bold"
            >
              <span>Book a Slot Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Quick Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/farmer/procurement"
            className="bg-white border border-slate-200 rounded p-4 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Weighbridge Status</span>
              <Scale className="w-4 h-4 text-[#0B2545]" />
            </div>
            <p className="text-sm font-bold text-slate-900">Crop Verification</p>
            <p className="text-[11px] text-slate-500">
              Grade A (FAQ), Net Weight, Moisture % probe verification
            </p>
          </Link>

          <Link
            href="/farmer/payments"
            className="bg-white border border-slate-200 rounded p-4 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">DBT Settlements</span>
              <CreditCard className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-sm font-bold text-slate-900">PFMS / Direct Bank Credit</p>
            <p className="text-[11px] text-slate-500">
              Linked A/C: <span className="font-mono font-bold">XXXX-XXXX-4921</span> (SBI)
            </p>
          </Link>

          <Link
            href="/farmer/history"
            className="bg-white border border-slate-200 rounded p-4 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Previous Records</span>
              <FileText className="w-4 h-4 text-[#B91C1C]" />
            </div>
            <p className="text-sm font-bold text-slate-900">Procurement History</p>
            <p className="text-[11px] text-slate-500">
              Download government digital receipts & view past MSP settlements
            </p>
          </Link>
        </div>
      </div>
    </FarmerLayout>
  );
}

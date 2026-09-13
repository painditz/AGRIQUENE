"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { api, CentreQueueStatus, QueueItem, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { useToast } from "@/context/ToastContext";
import {
  Activity, Play, CheckCircle2, AlertCircle, Clock,
  Users, RefreshCw, Scale, ChevronRight, Volume2, UserCheck, SkipForward,
  Info, Eye, X, MapPin, Calendar, ShieldCheck, Truck, ClipboardCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StaffQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lastEvent, playAlertSound, setActiveCentreId } = useQueueSocket();
  const { showToast } = useToast();

  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Inspector Modal State
  const [inspectToken, setInspectToken] = useState<QueueItem | null>(null);

  // Centre isolation: lock to user.centreId if staff officer
  const isOfficer = user?.role === "MANDI_OFFICER" || user?.role === "BUYER";
  const effectiveCentreId = (isOfficer && user?.centreId) ? user.centreId : (selectedCentreId || user?.centreId || 1);

  useEffect(() => {
    async function loadCentres() {
      try {
        const data = await api.getCentres();
        setCentres(data);
        if (!selectedCentreId) {
          const initId = user?.centreId || (data.length > 0 ? data[0].id : 1);
          setSelectedCentreId(initId);
          setActiveCentreId(initId);
        }
      } catch {}
    }
    loadCentres();
  }, [user?.centreId, selectedCentreId, setActiveCentreId]);

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getCentreQueue(effectiveCentreId);
      setQueueStatus(data);
      if (inspectToken) {
        const updated = data.queue.find(q => q.token_id === inspectToken.token_id);
        if (updated) setInspectToken(updated);
      }
    } catch {
      showToast("Unable to fetch queue state from backend", "error");
    } finally {
      setLoading(false);
    }
  }, [effectiveCentreId, inspectToken, showToast]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  useEffect(() => {
    if (lastEvent) {
      loadQueue();
      if (lastEvent.type === "TOKEN_CALLED") {
        playAlertSound();
      }
    }
  }, [lastEvent, loadQueue, playAlertSound]);

  const handleCallNext = async (counterNum = 1, specificTokenId?: number) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.callNextToken(counterNum, effectiveCentreId, specificTokenId);
      setActionMessage(res.message);
      showToast(res.message, "success");
      await loadQueue();
    } catch (err: any) {
      showToast(err.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrived = async (tokenId: number) => {
    setActionLoadingId(tokenId);
    try {
      const res = await api.markArrived(tokenId);
      showToast(res.message || "Farmer marked arrived", "success");
      await loadQueue();
    } catch (err: any) {
      showToast(err.message || "Failed to mark arrived", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartInspection = async (tokenId: number) => {
    setActionLoadingId(tokenId);
    try {
      const res = await api.startInspection(tokenId);
      showToast(res.message || "Crop quality inspection initiated", "success");
      await loadQueue();
    } catch (err: any) {
      showToast(err.message || "Failed to start inspection", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartWeighing = async (tokenId: number) => {
    setActionLoadingId(tokenId);
    try {
      await api.startWeighing(tokenId);
      showToast("Token assigned to weighbridge desk", "success");
      router.push(`/staff/procurement?token_id=${tokenId}`);
    } catch (err: any) {
      showToast(err.message || "Failed to start weighing", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSkipToken = async (tokenId: number) => {
    setActionLoadingId(tokenId);
    try {
      const res = await api.skipToken(tokenId);
      showToast(res.message || "Token skipped", "warning");
      await loadQueue();
    } catch (err: any) {
      showToast(err.message || "Failed to skip token", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentServingItem = queueStatus?.queue.find(
    (item) => item.status === "CALLED" || item.status === "PROCESSING" || item.status === "INSPECTION" || item.status === "WEIGHING"
  );

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
                OPERATIONAL DESK
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Assigned Centre #{effectiveCentreId}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              {queueStatus?.centre_name || "Narela Krishi Grain Mandi (APMC)"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Serving: <strong>Counter #1</strong> • Live capacity synchronization with gate & weighbridge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCallNext(1)}
              disabled={actionLoading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{actionLoading ? "Calling..." : "Call Next in Queue"}</span>
            </button>

            <button
              onClick={loadQueue}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-lg border border-slate-300 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Currently Serving</span>
            <span className="text-2xl font-black font-mono text-[#0B2545] block mt-1">
              {queueStatus?.current_serving_token || "None"}
            </span>
            <span className="text-[11px] text-slate-500">
              {currentServingItem ? currentServingItem.farmer_name : "Ready for next"}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Total Waiting</span>
            <span className="text-2xl font-black font-mono text-amber-600 block mt-1">
              {queueStatus?.total_waiting || 0}
            </span>
            <span className="text-[11px] text-slate-500">Farmers in queue</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Completed Today</span>
            <span className="text-2xl font-black font-mono text-emerald-700 block mt-1">
              {queueStatus?.total_completed_today || 0}
            </span>
            <span className="text-[11px] text-slate-500">Procurements executed</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Active Counters</span>
            <span className="text-2xl font-black font-mono text-blue-700 block mt-1">
              {queueStatus?.active_counters || 4}
            </span>
            <span className="text-[11px] text-slate-500">Operational desks</span>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0B2545]" />
              <h3 className="text-sm font-black text-[#0B2545] font-serif">
                Active Queue Ledger & Desk Operations
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Real-time synchronization • Click any row or Inspect button to view dossier
            </span>
          </div>

          {loading && !queueStatus ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Centre Queue Stream...</p>
            </div>
          ) : !queueStatus?.queue || queueStatus.queue.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No farmers currently in queue.</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tokens booked by farmers at this mandi will automatically synchronize here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b font-bold tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12">Pos</th>
                    <th className="p-3">Token</th>
                    <th className="p-3">Farmer</th>
                    <th className="p-3">Crop / Qty</th>
                    <th className="p-3">Slot Window</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Est. Wait</th>
                    <th className="p-3 text-center">Desk Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueStatus?.queue.map((item) => {
                    const isBusy = actionLoadingId === item.token_id;
                    const isServing = item.status === "CALLED" || item.status === "PROCESSING" || item.status === "INSPECTION" || item.status === "WEIGHING";
                    return (
                      <tr
                        key={item.token_id}
                        className={`hover:bg-slate-50 transition cursor-pointer ${
                          isServing ? "bg-amber-50/50" : ""
                        }`}
                        onClick={() => setInspectToken(item)}
                      >
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {item.position > 0 ? `#${item.position}` : "—"}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#0B2545]">
                          {item.token_display}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{item.farmer_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.farmer_mobile_masked}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">{item.crop}</span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            {item.quantity_quintals} Quintals
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {item.slot_date} ({item.slot_time})
                        </td>
                        <td className="p-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {item.status === "WAITING" || item.status === "BOOKED" ? `${item.estimated_wait_min}m` : "At Desk"}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {(item.status === "WAITING" || item.status === "BOOKED") && (
                              <button
                                onClick={() => handleMarkArrived(item.token_id)}
                                disabled={isBusy}
                                className="px-2 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-bold"
                              >
                                Mark Arrived
                              </button>
                            )}

                            {(item.status === "WAITING" || item.status === "ARRIVED" || item.status === "BOOKED") && (
                              <button
                                onClick={() => handleCallNext(1, item.token_id)}
                                disabled={isBusy}
                                className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded text-[10px] font-bold"
                              >
                                Call
                              </button>
                            )}

                            {item.status === "CALLED" && (
                              <button
                                onClick={() => handleStartInspection(item.token_id)}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-300 rounded text-[10px] font-bold flex items-center gap-1"
                              >
                                <ClipboardCheck className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            )}

                            {(item.status === "CALLED" || item.status === "INSPECTION") && (
                              <button
                                onClick={() => handleStartWeighing(item.token_id)}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1"
                              >
                                <Scale className="w-3 h-3" />
                                <span>Weigh</span>
                              </button>
                            )}

                            {(item.status === "PROCESSING" || item.status === "WEIGHING") && (
                              <Link
                                href={`/staff/procurement?token_id=${item.token_id}`}
                                className="px-2.5 py-1 bg-[#0B2545] text-white hover:bg-[#133E68] rounded text-[10px] font-bold inline-flex items-center gap-1"
                              >
                                <Scale className="w-3 h-3" />
                                <span>Desk Form</span>
                              </Link>
                            )}

                            <button
                              onClick={() => handleSkipToken(item.token_id)}
                              disabled={isBusy || item.status === "COMPLETED" || item.status === "PROCUREMENT_COMPLETED"}
                              className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold"
                            >
                              Skip
                            </button>

                            <button
                              onClick={() => setInspectToken(item)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                              title="Inspect Farmer Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Farmer Dossier Modal */}
        {inspectToken && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-[#0B2545]">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-black text-[#0B2545] font-serif">
                    Farmer Dossier: {inspectToken.token_display}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectToken(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Farmer Name</span>
                  <span className="font-bold text-slate-900 text-sm">{inspectToken.farmer_name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Mobile Number</span>
                  <span className="font-mono font-bold text-slate-900">{inspectToken.farmer_mobile_masked}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Mandi / Centre</span>
                  <span className="font-bold text-slate-900">{inspectToken.mandi_name || "Narela Krishi Grain Mandi (APMC)"}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Slot Window</span>
                  <span className="font-mono font-bold text-slate-900">{inspectToken.slot_date} ({inspectToken.slot_time})</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Declared Crop</span>
                  <span className="font-bold text-slate-900">{inspectToken.crop}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Declared Quantity</span>
                  <span className="font-bold text-emerald-800 text-sm">{inspectToken.quantity_quintals} Qtl</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Vehicle Information</span>
                  <span className="font-bold text-slate-900">
                    {inspectToken.vehicle_number ? `${inspectToken.vehicle_type || 'Vehicle'}: ${inspectToken.vehicle_number}` : "Standard Tractor / Trolley"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 block">Booking Date</span>
                  <span className="font-mono text-slate-900">{inspectToken.booking_date || inspectToken.slot_date}</span>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  onClick={() => setInspectToken(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                <Link
                  href={`/staff/procurement?token_id=${inspectToken.token_id}`}
                  className="px-4 py-2 bg-[#0B2545] text-white rounded-lg text-xs font-bold hover:bg-[#133E68] inline-flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Proceed to Weighing Desk</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

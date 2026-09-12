"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { api, CentreQueueStatus, QueueItem, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { useToast } from "@/context/ToastContext";
import {
  Activity, Play, CheckCircle2, AlertCircle, Clock,
  Users, RefreshCw, Scale, ChevronRight, Volume2, UserCheck, SkipForward,
  Info, Eye, X, MapPin, Calendar, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BuyerQueuePage() {
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

  // Fetch available centres and initialize centre ID
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

  const effectiveCentreId = selectedCentreId || user?.centreId || 1;

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getCentreQueue(effectiveCentreId);
      setQueueStatus(data);
      if (inspectToken) {
        const updated = data.queue.find(q => q.token_id === inspectToken.token_id);
        if (updated) setInspectToken(updated);
      }
    } catch {
      showToast("Unable to load latest queue data", "error");
    } finally {
      setLoading(false);
    }
  }, [effectiveCentreId, inspectToken, showToast]);

  useEffect(() => {
    if (effectiveCentreId) {
      setActiveCentreId(effectiveCentreId);
      loadQueue();
    }
  }, [effectiveCentreId, loadQueue, setActiveCentreId]);

  useEffect(() => {
    if (lastEvent) {
      loadQueue();
    }
  }, [lastEvent, loadQueue]);

  const handleCallNext = async (tokenId?: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionLoadingId(tokenId || -1);
    setActionMessage(null);
    try {
      const res = await api.callNextToken({ token_id: tokenId, counter_number: 1 }, effectiveCentreId);
      const msg = `Token ${res.called_token} called to Counter #1! SMS alert sent.`;
      setActionMessage(`✓ ${msg}`);
      showToast(msg, "info", "Token Called");
      playAlertSound();
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not call next token";
      setActionMessage(msg);
      showToast(msg, "error", "Call Error");
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleMarkArrived = async (tokenId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionLoadingId(tokenId);
    try {
      await api.markFarmerArrived(tokenId);
      const msg = `Farmer token marked as physically arrived at mandi gate.`;
      setActionMessage(`✓ ${msg}`);
      showToast(msg, "success", "Arrival Logged");
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark arrived";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleStartWeighing = async (tokenId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionLoadingId(tokenId);
    try {
      await api.startTokenProcessing(tokenId);
      const msg = `Produce weighing and quality inspection started on counter.`;
      setActionMessage(`✓ ${msg}`);
      showToast(msg, "info", "Inspection Started");
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start inspection";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleSkip = async (tokenId: number) => {
    if (actionLoading) return;
    if (!confirm("Are you sure you want to mark this farmer absent / skip this token?")) return;
    setActionLoading(true);
    setActionLoadingId(tokenId);
    try {
      await api.skipToken(tokenId);
      const msg = `Token marked absent and moved to end of queue.`;
      setActionMessage(`✓ ${msg}`);
      showToast(msg, "warning", "Token Skipped");
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to skip token";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (tokenId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionLoadingId(tokenId);
    try {
      await api.completeToken(tokenId);
      const msg = "Procurement weighing cycle completed successfully.";
      setActionMessage(`✓ ${msg}`);
      showToast(msg, "success", "Token Completed");
      if (inspectToken?.token_id === tokenId) {
        setInspectToken(null);
      }
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete token";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              ACTIVE WEIGHBRIDGE QUEUE CONTROLLER
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              {queueStatus?.centre_name || "Mandi Queue Management Deck"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Active Mandi:</span>
              {centres.length > 1 ? (
                <select
                  value={effectiveCentreId}
                  onChange={(e) => setSelectedCentreId(parseInt(e.target.value))}
                  className="text-xs font-bold text-[#0B2545] bg-slate-50 border border-slate-300 rounded p-1 outline-none"
                >
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800">{queueStatus?.centre_name || "Loading..."}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Action Button: CALL NEXT TOKEN */}
            <button
              onClick={() => handleCallNext()}
              disabled={actionLoading}
              className="btn-gov-red py-2.5 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-current ${actionLoading && actionLoadingId === -1 ? "animate-spin" : ""}`} />
              <span>{actionLoading && actionLoadingId === -1 ? "Calling Token..." : "CALL NEXT TOKEN"}</span>
            </button>

            <button
              onClick={loadQueue}
              disabled={loading}
              className="btn-gov-outline p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Refresh Queue Table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-400 text-emerald-900 p-3.5 rounded-md text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Serving Highlight */}
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-[#B91C1C] rounded-md p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#B91C1C] text-white rounded text-center">
              <span className="text-[10px] font-bold uppercase block">SERVING</span>
              <span className="text-2xl font-black font-mono">
                {queueStatus?.current_serving_token || "None"}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Current Produce on Weighbridge Counter #1
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Total waiting in line: <strong className="text-[#0B2545] font-mono">{queueStatus?.total_waiting || 0} farmers</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/buyer/procurement"
              className="btn-gov-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Open Certified Weighing Deck</span>
            </Link>
          </div>
        </div>

        {/* Queue Table & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Waiting Farmers Queue Table
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Live Synchronized ({queueStatus?.centre_name || "Mandi"})
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Pos</th>
                  <th className="p-2.5 font-bold">Token</th>
                  <th className="p-2.5 font-bold">Farmer Name</th>
                  <th className="p-2.5 font-bold">Mobile</th>
                  <th className="p-2.5 font-bold">Crop & Volume</th>
                  <th className="p-2.5 font-bold">Slot Time</th>
                  <th className="p-2.5 font-bold">AI ETA</th>
                  <th className="p-2.5 font-bold">Status</th>
                  <th className="p-2.5 font-bold text-right">Desk Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(!queueStatus?.queue || queueStatus.queue.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                      No tokens currently waiting in queue for this mandi.
                    </td>
                  </tr>
                ) : (
                  queueStatus.queue.map((item) => {
                    const isServing = item.status === "CALLED" || item.status === "PROCESSING";
                    const isThisItemLoading = actionLoading && actionLoadingId === item.token_id;
                    return (
                      <tr
                        key={item.token_id}
                        className={`hover:bg-slate-50 transition cursor-pointer ${
                          isServing ? "bg-rose-50/70 font-semibold" : ""
                        }`}
                        onClick={() => setInspectToken(item)}
                      >
                        <td className="p-2.5 font-mono">
                          {item.position === 0 ? "Serving" : `#${item.position}`}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#0B2545]">
                          {item.token_display}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {item.farmer_name}
                          {item.farmer_village ? (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {item.farmer_village}
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">{item.farmer_mobile_masked}</td>
                        <td className="p-2.5">
                          {item.crop} ({item.quantity_quintals} Qtl)
                        </td>
                        <td className="p-2.5 font-mono">{item.slot_time}</td>
                        <td className="p-2.5 font-mono font-bold text-[#B91C1C]">
                          {item.estimated_wait_min} min ({item.expected_turn_time})
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="p-2.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectToken(item)}
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 text-[10px] font-bold px-2 py-1 rounded transition"
                            title="Inspect Farmer and Token Details"
                          >
                            Inspect
                          </button>

                          {item.status === "WAITING" && (
                            <button
                              onClick={() => handleMarkArrived(item.token_id)}
                              disabled={actionLoading}
                              className="bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50"
                              title="Mark Farmer as physically arrived"
                            >
                              Arrived
                            </button>
                          )}

                          <button
                            onClick={() => handleCallNext(item.token_id)}
                            disabled={actionLoading}
                            className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 text-[10px] font-bold px-2.5 py-1 rounded transition disabled:opacity-50"
                            title="Call this specific token to counter"
                          >
                            {isThisItemLoading ? "Calling..." : "Call"}
                          </button>

                          {(item.status === "CALLED" || item.status === "PROCESSING") && (
                            <Link
                              href={`/buyer/procurement?token_id=${item.token_id}`}
                              className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold px-2 py-1 rounded transition inline-block"
                              title="Open Weighbridge Entry Deck"
                            >
                              Weigh
                            </Link>
                          )}

                          <button
                            onClick={() => handleSkip(item.token_id)}
                            disabled={actionLoading}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 text-[10px] font-bold px-1.5 py-1 rounded transition disabled:opacity-50"
                            title="Skip / Absent"
                          >
                            Skip
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {(!queueStatus?.queue || queueStatus.queue.length === 0) ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded border">
                No tokens currently waiting in queue for this mandi.
              </div>
            ) : (
              queueStatus.queue.map((item) => {
                const isServing = item.status === "CALLED" || item.status === "PROCESSING";
                const isThisItemLoading = actionLoading && actionLoadingId === item.token_id;
                return (
                  <div
                    key={item.token_id}
                    className={`p-3.5 rounded border text-xs space-y-2 ${
                      isServing
                        ? "bg-rose-50 border-rose-300 font-semibold"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#0B2545]">
                        Pos #{item.position}: {item.token_display}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex justify-between text-slate-700">
                      <div>
                        <span className="font-semibold block">{item.farmer_name}</span>
                        {item.farmer_village && (
                          <span className="text-[10px] text-slate-400">{item.farmer_village}</span>
                        )}
                      </div>
                      <span>{item.crop} · {item.quantity_quintals} Qtl</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>ETA: <strong className="text-[#B91C1C] font-mono">{item.estimated_wait_min}m</strong> ({item.expected_turn_time})</span>
                      <span>Slot: {item.slot_time}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => setInspectToken(item)}
                        className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2 py-1 rounded"
                      >
                        Inspect
                      </button>
                      {item.status === "WAITING" && (
                        <button
                          onClick={() => handleMarkArrived(item.token_id)}
                          disabled={actionLoading}
                          className="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-1 rounded"
                        >
                          Arrived
                        </button>
                      )}
                      <button
                        onClick={() => handleCallNext(item.token_id)}
                        disabled={actionLoading}
                        className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-3 py-1 rounded"
                      >
                        {isThisItemLoading ? "Calling..." : "Call"}
                      </button>
                      {(item.status === "CALLED" || item.status === "PROCESSING") && (
                        <Link
                          href={`/buyer/procurement?token_id=${item.token_id}`}
                          className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded inline-block"
                        >
                          Weigh
                        </Link>
                      )}
                      <button
                        onClick={() => handleSkip(item.token_id)}
                        disabled={actionLoading}
                        className="bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold px-2 py-1 rounded"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Farmer & Token Inspector Modal */}
        {inspectToken && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-md border-2 border-[#0B2545] shadow-2xl max-w-xl w-full p-6 space-y-5 animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                    WEIGHBRIDGE DESK INSPECTOR
                  </span>
                  <h3 className="text-lg font-black text-[#0B2545] font-serif">
                    Token {inspectToken.token_display} — {inspectToken.farmer_name}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectToken(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Pos Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Queue Position</span>
                  <span className="font-mono font-extrabold text-sm text-[#0B2545]">
                    {inspectToken.position === 0 ? "Currently at Counter" : `Position #${inspectToken.position}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Status</span>
                  <StatusBadge status={inspectToken.status} />
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Wait Estimate</span>
                  <span className="font-mono font-bold text-[#B91C1C]">
                    {inspectToken.estimated_wait_min} min ({inspectToken.expected_turn_time})
                  </span>
                </div>
              </div>

              {/* Farmer & Booking Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-200 rounded p-3 space-y-1 bg-white">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Farmer Information</span>
                  <p className="font-bold text-slate-900 text-sm">{inspectToken.farmer_name}</p>
                  <p className="text-slate-600 font-mono">Mobile: {inspectToken.farmer_mobile_masked}</p>
                  {inspectToken.farmer_id_card && (
                    <p className="text-slate-500 font-mono text-[11px]">ID: {inspectToken.farmer_id_card}</p>
                  )}
                  {(inspectToken.farmer_village || inspectToken.farmer_district) && (
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{[inspectToken.farmer_village, inspectToken.farmer_district].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                </div>

                <div className="border border-slate-200 rounded p-3 space-y-1 bg-white">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Produce & Booking</span>
                  <p className="font-bold text-[#0B2545] text-sm">{inspectToken.crop}</p>
                  <p className="text-slate-700 font-semibold">
                    Declared: <span className="font-mono font-bold text-[#0B2545]">{inspectToken.quantity_quintals} Qtl</span> (~{inspectToken.quantity_quintals * 100} kg)
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    Ref: {inspectToken.booking_reference || "N/A"}
                  </p>
                  <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Slot: {inspectToken.slot_date || "Today"} at {inspectToken.slot_time}</span>
                  </p>
                </div>
              </div>

              {/* Lifecycle Timestamps */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Operational Timeline</span>
                <div className="grid grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="block text-slate-400">Arrived at Gate:</span>
                    <span className="font-mono font-semibold">
                      {inspectToken.arrived_at ? new Date(inspectToken.arrived_at).toLocaleTimeString() : "Not arrived yet"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Called to Counter:</span>
                    <span className="font-mono font-semibold">
                      {inspectToken.called_at ? new Date(inspectToken.called_at).toLocaleTimeString() : "Pending call"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Inspection Started:</span>
                    <span className="font-mono font-semibold">
                      {inspectToken.started_at ? new Date(inspectToken.started_at).toLocaleTimeString() : "Not started"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Modal */}
              <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInspectToken(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {inspectToken.status === "WAITING" && (
                    <button
                      onClick={() => handleMarkArrived(inspectToken.token_id)}
                      disabled={actionLoading}
                      className="btn-gov-outline text-xs py-2 px-3 font-bold text-blue-700 border-blue-300 hover:bg-blue-50 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Mark Arrived</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCallNext(inspectToken.token_id)}
                    disabled={actionLoading}
                    className="btn-gov-red text-xs py-2 px-3 font-bold flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Call to Counter</span>
                  </button>

                  <button
                    onClick={() => handleStartWeighing(inspectToken.token_id)}
                    disabled={actionLoading}
                    className="btn-gov-outline text-xs py-2 px-3 font-bold text-purple-700 border-purple-300 hover:bg-purple-50 flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Start Inspection</span>
                  </button>

                  <Link
                    href={`/buyer/procurement?token_id=${inspectToken.token_id}`}
                    className="btn-gov-primary text-xs py-2 px-3 font-bold flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Weigh & Procure</span>
                  </Link>

                  <button
                    onClick={() => handleSkip(inspectToken.token_id)}
                    disabled={actionLoading}
                    className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1.5 font-bold"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

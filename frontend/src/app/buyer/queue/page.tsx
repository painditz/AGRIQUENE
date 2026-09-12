"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { api, CentreQueueStatus, QueueItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQueueSocket } from "@/context/QueueSocketContext";
import { useToast } from "@/context/ToastContext";
import {
  Activity, Play, CheckCircle2, AlertCircle, Clock,
  Users, RefreshCw, Scale, ChevronRight, Volume2, UserCheck, SkipForward
} from "lucide-react";
import Link from "next/link";

export default function BuyerQueuePage() {
  const { lastEvent, playAlertSound } = useQueueSocket();
  const { showToast } = useToast();

  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getCentreQueue(1);
      setQueueStatus(data);
    } catch {
      showToast("Unable to load latest queue data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

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
      const res = await api.callNextToken({ token_id: tokenId, counter_number: 1 }, 1);
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
      const msg = `Farmer token marked as arrived at mandi gate.`;
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

  const handleSkip = async (tokenId: number) => {
    if (actionLoading) return;
    if (!confirm("Are you sure you want to mark this farmer absent / skip this token?")) return;
    setActionLoading(true);
    setActionLoadingId(tokenId);
    try {
      await api.skipToken(tokenId);
      const msg = `Token marked absent and skipped to end of queue.`;
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
              Mandi Queue Management Deck
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Counter #1 · Calling tokens instantly updates connected farmers and calculates XGBoost ETAs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Action Button: CALL NEXT TOKEN (Requirement 20) */}
            <button
              onClick={() => handleCallNext()}
              disabled={actionLoading}
              className="btn-gov-red py-2.5 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              <Play className={`w-4 h-4 fill-current ${actionLoading && actionLoadingId === -1 ? "animate-spin" : ""}`} />
              <span>{actionLoading && actionLoadingId === -1 ? "Calling Token..." : "CALL NEXT TOKEN"}</span>
            </button>

            <button
              onClick={loadQueue}
              disabled={loading}
              className="btn-gov-outline p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                {queueStatus?.current_serving_token || "#114"}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Current Produce on Weighbridge Counter #1
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Total waiting in line: <strong className="text-[#0B2545] font-mono">{queueStatus?.total_waiting || 14} farmers</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/buyer/procurement"
              className="btn-gov-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Complete Procurement Weighing</span>
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
              Live Synchronized (Ghaziabad Mandi)
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
                {queueStatus?.queue.map((item) => {
                  const isServing = item.status === "CALLED" || item.status === "PROCESSING";
                  const isDemoTarget = item.token_display === "#128";
                  const isThisItemLoading = actionLoading && actionLoadingId === item.token_id;
                  return (
                    <tr
                      key={item.token_id}
                      className={`hover:bg-slate-50 transition ${
                        isServing ? "bg-rose-50/70 font-semibold" : isDemoTarget ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <td className="p-2.5 font-mono">
                        {item.position === 0 ? "Serving" : `#${item.position}`}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#0B2545]">
                        {item.token_display} {isDemoTarget && "(Demo Farmer)"}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">{item.farmer_name}</td>
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
                      <td className="p-2.5 text-right space-x-1">
                        {item.status === "WAITING" && (
                          <button
                            onClick={() => handleMarkArrived(item.token_id)}
                            disabled={actionLoading}
                            className="bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50"
                            title="Mark Farmer as physically arrived"
                          >
                            Mark Arrived
                          </button>
                        )}

                        {(item.status === "CALLED" || item.status === "PROCESSING") && (
                          <button
                            onClick={() => handleComplete(item.token_id)}
                            disabled={actionLoading}
                            className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50"
                            title="Complete weighing and procurement"
                          >
                            Complete
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
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {queueStatus?.queue.map((item) => {
              const isServing = item.status === "CALLED" || item.status === "PROCESSING";
              const isDemoTarget = item.token_display === "#128";
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
                    <span className="font-semibold">{item.farmer_name}</span>
                    <span>{item.crop} · {item.quantity_quintals} Qtl</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>ETA: <strong className="text-[#B91C1C] font-mono">{item.estimated_wait_min}m</strong> ({item.expected_turn_time})</span>
                    <span>Slot: {item.slot_time}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5 flex-wrap">
                    {item.status === "WAITING" && (
                      <button
                        onClick={() => handleMarkArrived(item.token_id)}
                        disabled={actionLoading}
                        className="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-1.5 rounded"
                      >
                        Arrived
                      </button>
                    )}
                    {(item.status === "CALLED" || item.status === "PROCESSING") && (
                      <button
                        onClick={() => handleComplete(item.token_id)}
                        disabled={actionLoading}
                        className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1.5 rounded"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => handleCallNext(item.token_id)}
                      disabled={actionLoading}
                      className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-3 py-1.5 rounded"
                    >
                      {isThisItemLoading ? "Calling..." : "Call"}
                    </button>
                    <button
                      onClick={() => handleSkip(item.token_id)}
                      disabled={actionLoading}
                      className="bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold px-2 py-1.5 rounded"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}


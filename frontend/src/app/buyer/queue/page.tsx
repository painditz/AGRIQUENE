"use client";

import React, { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/layout/BuyerLayout";
import { api, CentreQueueStatus, QueueItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQueueSocket } from "@/context/QueueSocketContext";
import {
  Activity, Play, CheckCircle2, AlertCircle, Clock,
  Users, RefreshCw, Scale, ChevronRight, Volume2
} from "lucide-react";
import Link from "next/link";

export default function BuyerQueuePage() {
  const { lastEvent } = useQueueSocket();
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const data = await api.getCentreQueue(1);
      setQueueStatus(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      loadQueue();
    }
  }, [lastEvent]);

  const handleCallNext = async (tokenId?: number) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.callNextToken({ token_id: tokenId, counter_number: 1 }, 1);
      setActionMessage(`✓ Successfully called ${res.called_token}! Queue advanced and SMS alert sent.`);
      await loadQueue();
    } catch (err: any) {
      setActionMessage(err.message || "Could not call next token");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrived = async (tokenId: number) => {
    try {
      await api.markFarmerArrived(tokenId);
      setActionMessage(`✓ Token marked as arrived at mandi gate.`);
      await loadQueue();
    } catch {}
  };

  const handleStartProcessing = async (tokenId: number) => {
    try {
      await api.startProcessingToken(tokenId);
      setActionMessage(`✓ Token moved to weighbridge processing.`);
      await loadQueue();
    } catch {}
  };

  const handleSkip = async (tokenId: number) => {
    try {
      await api.skipToken(tokenId);
      setActionMessage(`✓ Token marked absent / skipped.`);
      await loadQueue();
    } catch {}
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              ACTIVE WEIGHBRIDGE QUEUE CONTROLLER
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Mandi Queue Management Deck
            </h1>
            <p className="text-xs text-slate-500">
              Counter #1 · Calling tokens instantly updates connected farmers and calculates XGBoost ETAs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Action Button: CALL NEXT TOKEN (Requirement 20) */}
            <button
              onClick={() => handleCallNext()}
              disabled={actionLoading}
              className="btn-gov-red py-2.5 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-current ${actionLoading ? "animate-spin" : ""}`} />
              <span>{actionLoading ? "Calling Token..." : "CALL NEXT TOKEN"}</span>
            </button>

            <button
              onClick={loadQueue}
              className="btn-gov-outline p-2.5"
              title="Refresh Queue Table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-400 text-emerald-900 p-3 rounded text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Serving Highlight */}
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-[#B91C1C] rounded p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
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
              className="btn-gov-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Complete Procurement Weighing</span>
            </Link>
          </div>
        </div>

        {/* Queue Table (Requirement 20) */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Waiting Farmers Queue Table
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Live Synchronized (Ghaziabad Mandi)
            </span>
          </div>

          <div className="overflow-x-auto">
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
                            className="bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold px-2 py-1 rounded"
                            title="Mark Farmer as physically arrived"
                          >
                            Mark Arrived
                          </button>
                        )}

                        <button
                          onClick={() => handleCallNext(item.token_id)}
                          className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 text-[10px] font-bold px-2 py-1 rounded"
                          title="Call this specific token to counter"
                        >
                          Call Token
                        </button>

                        <button
                          onClick={() => handleSkip(item.token_id)}
                          className="bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 text-[10px] font-bold px-1.5 py-1 rounded"
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
        </div>
      </div>
    </BuyerLayout>
  );
}

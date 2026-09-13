"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  Ticket, Search, Filter, RefreshCw, CheckCircle2,
  Clock, MapPin, Building2, Eye, ShieldAlert, ArrowUpRight,
  AlertTriangle, X, Check, FileText, UserCheck, Trash2
} from "lucide-react";

export default function AdminTokensPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tokens, setTokens] = useState<any[]>([]);
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCentre, setSelectedCentre] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [inspectToken, setInspectToken] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tokenData, centreData] = await Promise.all([
        api.getAdminTokens({
          centre_id: selectedCentre !== "ALL" ? parseInt(selectedCentre) : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          search: search.trim() ? search.trim() : undefined,
        }),
        api.getCentres(),
      ]);
      setTokens(tokenData);
      setCentres(centreData);
    } catch {
      showToast("Unable to refresh token oversight register.", "error");
    } finally {
      setLoading(false);
    }
  }, [user, selectedCentre, selectedStatus, search, showToast]);

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      loadData();
    }
  }, [loadData, user]);

  const handleAction = async (tokenId: number, action: "EXPEDITE" | "VERIFY" | "CANCEL", reason?: string) => {
    setActionLoading(true);
    try {
      const res = await api.adminTokenAction(tokenId, action, reason);
      showToast(res.message, "success");
      if (inspectToken && inspectToken.id === tokenId) {
        setInspectToken(null);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute administrative action.";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const totalIssued = tokens.length;
  const waitingCount = tokens.filter((t) => t.status === "WAITING" || t.status === "ARRIVED").length;
  const processingCount = tokens.filter((t) => t.status === "PROCESSING" || t.status === "CALLED").length;
  const completedCount = tokens.filter((t) => t.status === "COMPLETED").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              DIRECTIVE OVERSIGHT & SURVEILLANCE
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              Mandi Token & Queue Oversight
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking, verification, and queue intervention across all 104 state procurement mandis.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="btn-gov-outline py-2 px-3 text-xs font-bold flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-500">Tokens Issued</span>
            <p className="text-2xl font-black text-[#0B2545] font-mono mt-1">{totalIssued}</p>
            <span className="text-[10px] text-slate-400">Total appointments booked</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-amber-900">In Active Queue</span>
            <p className="text-2xl font-black text-amber-900 font-mono mt-1">{waitingCount}</p>
            <span className="text-[10px] text-amber-700">Waiting or arrived at gate</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-blue-900">At Weighbridge Counter</span>
            <p className="text-2xl font-black text-blue-900 font-mono mt-1">{processingCount}</p>
            <span className="text-[10px] text-blue-700">Called or undergoing weighing</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-emerald-900">Procurement Settled</span>
            <p className="text-2xl font-black text-emerald-900 font-mono mt-1">{completedCount}</p>
            <span className="text-[10px] text-emerald-700">Weighing complete & receipted</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by farmer name, mobile, token (#101), or ID card..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            />
          </div>

          {/* Mandi Filter */}
          <div>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            >
              <option value="ALL">All Procurement Mandis (104)</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district}, {c.state})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">WAITING</option>
              <option value="ARRIVED">ARRIVED (At Gate)</option>
              <option value="CALLED">CALLED (To Counter)</option>
              <option value="PROCESSING">PROCESSING (Weighbridge)</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="SKIPPED">SKIPPED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          {loading ? (
            <div className="space-y-2 p-4">
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No active procurement tokens</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No farmer bookings match the active filter criteria. Adjust the search or mandi dropdown to view entries.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                    <th className="p-2.5 font-bold">Token & Ref</th>
                    <th className="p-2.5 font-bold">Farmer Name & ID</th>
                    <th className="p-2.5 font-bold">Location</th>
                    <th className="p-2.5 font-bold">Procurement Mandi</th>
                    <th className="p-2.5 font-bold">Crop & Volume</th>
                    <th className="p-2.5 font-bold">Slot Window</th>
                    <th className="p-2.5 font-bold text-center">Position</th>
                    <th className="p-2.5 font-bold">Status</th>
                    <th className="p-2.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tokens.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono">
                        <span className="font-bold text-[#0B2545] text-sm block">
                          {t.token_display}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {t.booking_reference || "N/A"}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <span className="font-bold text-slate-900 block">{t.farmer_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {t.farmer_id_card ? <span className="font-semibold text-slate-700">{t.farmer_id_card} • </span> : null}
                          {t.farmer_mobile || "Verified"}
                        </span>
                      </td>

                      <td className="p-2.5 text-slate-600">
                        <span>{[t.farmer_village, t.farmer_district].filter(Boolean).join(", ") || "Registered"}</span>
                      </td>

                      <td className="p-2.5 font-semibold text-slate-800">
                        {t.centre_name}
                      </td>

                      <td className="p-2.5">
                        <span className="font-bold text-slate-800 block">{t.crop}</span>
                        <span className="text-[11px] font-mono text-[#0B2545]">
                          {t.quantity} Qtl (~{t.quantity * 100} kg)
                        </span>
                      </td>

                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                        <div>{t.slot_date || "Today"}</div>
                        <div className="text-slate-400">{t.slot_time}</div>
                      </td>

                      <td className="p-2.5 text-center font-mono">
                        {t.current_position === 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                            Serving
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800">#{t.current_position}</span>
                        )}
                      </td>

                      <td className="p-2.5">
                        <StatusBadge status={t.status} />
                      </td>

                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectToken(t)}
                          className="bg-[#0B2545] hover:bg-[#133E68] text-white py-1 px-2.5 rounded text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Token Inspection Modal */}
      {inspectToken && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between border-b-2 border-[#B91C1C]">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 block">
                    GOVERNMENT MANDI TOKEN DOSSIER
                  </span>
                  <h3 className="text-base font-bold">
                    Token {inspectToken.token_display} — {inspectToken.farmer_name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectToken(null)}
                className="text-slate-300 hover:text-white p-1 rounded font-bold transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Status Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-bold block">Current Lifecycle Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={inspectToken.status} />
                    <span className="text-slate-600 font-mono">
                      {inspectToken.current_position === 0 ? "At Counter / Counter Desk" : `Position #${inspectToken.current_position} in Queue`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block">Booking Reference</span>
                  <span className="font-mono font-bold text-[#0B2545] text-sm">
                    {inspectToken.booking_reference || "N/A"}
                  </span>
                </div>
              </div>

              {/* Farmer & Mandi Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded p-3.5 space-y-1.5 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Farmer Dossier</span>
                  <p className="text-sm font-bold text-slate-900">{inspectToken.farmer_name}</p>
                  <p className="text-slate-600 font-mono">Mobile: {inspectToken.farmer_mobile}</p>
                  {inspectToken.farmer_id_card && (
                    <p className="text-slate-500 font-mono text-[11px]">ID: {inspectToken.farmer_id_card}</p>
                  )}
                  <p className="text-slate-500 text-[11px]">
                    {[inspectToken.farmer_village, inspectToken.farmer_district].filter(Boolean).join(", ")}
                  </p>
                </div>

                <div className="border border-slate-200 rounded p-3.5 space-y-1.5 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Procurement Mandi & Produce</span>
                  <p className="text-sm font-bold text-[#0B2545]">{inspectToken.centre_name}</p>
                  <p className="text-slate-700 font-semibold">
                    Commodity: <strong className="text-slate-900">{inspectToken.crop}</strong>
                  </p>
                  <p className="text-slate-700 font-mono font-bold">
                    Declared: {inspectToken.quantity} Qtl (~{inspectToken.quantity * 100} kg)
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Slot: {inspectToken.slot_date || "Today"} ({inspectToken.slot_time})
                  </p>
                </div>
              </div>

              {/* Operational Timestamps */}
              <div className="border border-slate-200 rounded p-3.5 bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Gate & Weighbridge Timestamps</span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Booked</span>
                    <span className="font-mono text-slate-700 font-semibold text-[11px] block mt-0.5">
                      {inspectToken.created_at || "Recorded"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Gate Arrival</span>
                    <span className="font-mono text-slate-700 font-semibold text-[11px] block mt-0.5">
                      {inspectToken.arrived_at || "Pending"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Called</span>
                    <span className="font-mono text-slate-700 font-semibold text-[11px] block mt-0.5">
                      {inspectToken.called_at || "Pending"}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Completed</span>
                    <span className="font-mono text-slate-700 font-semibold text-[11px] block mt-0.5">
                      {inspectToken.completed_at || "In Progress"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weighbridge Procurement Settlement (if completed) */}
              {inspectToken.procurement_record && (
                <div className="border border-emerald-300 bg-emerald-50 rounded p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-800">
                      Certified Weighbridge Settlement
                    </span>
                    <span className="font-mono font-bold text-emerald-900">
                      {inspectToken.procurement_record.receipt_number}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                    <div>Gross: <strong>{inspectToken.procurement_record.gross_weight} Qtl</strong></div>
                    <div>Tare: <strong>{inspectToken.procurement_record.tare_weight} Qtl</strong></div>
                    <div>Net: <strong className="text-emerald-900">{inspectToken.procurement_record.net_weight} Qtl</strong></div>
                    <div>Moisture: <strong>{inspectToken.procurement_record.moisture_pct}%</strong></div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                    <span className="text-emerald-800 font-semibold">Total Authoritative MSP Value:</span>
                    <span className="text-base font-black text-emerald-950 font-mono">
                      ₹{inspectToken.procurement_record.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* DBT Payout Record */}
              {inspectToken.payout && (
                <div className="border border-blue-200 bg-blue-50 rounded p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-blue-800">Outbound DBT Disbursal</span>
                    <StatusBadge status={inspectToken.payout.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-900 font-mono">Ref: {inspectToken.payout.payout_ref}</span>
                    <span className="font-mono font-bold text-blue-950">
                      UTR: {inspectToken.payout.utr_number || "Awaiting PFMS Clearing"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Intervention Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {inspectToken.status === "WAITING" && (
                  <button
                    type="button"
                    onClick={() => handleAction(inspectToken.id, "EXPEDITE", "Directive priority queue jump")}
                    disabled={actionLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white py-1.5 px-3 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Expedite to #1</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAction(inspectToken.id, "VERIFY")}
                  disabled={actionLoading}
                  className="bg-blue-800 hover:bg-blue-900 text-white py-1.5 px-3 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Verify Farmer KYC</span>
                </button>

                {inspectToken.status !== "COMPLETED" && inspectToken.status !== "CANCELLED" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Cancel token ${inspectToken.token_display} for farmer ${inspectToken.farmer_name}?`)) {
                        handleAction(inspectToken.id, "CANCEL", "Administrative cancellation");
                      }
                    }}
                    disabled={actionLoading}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 py-1.5 px-3 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Token</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectToken(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api, AuditLogItem } from "@/lib/api";
import {
  ShieldCheck, RefreshCw, Filter, Search, Calendar,
  Clock, User, CheckCircle2, AlertCircle, FileText,
  Activity, ArrowUpDown, ArrowRight
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(
        actionFilter === "ALL" ? undefined : actionFilter,
        undefined,
        100
      );
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.user_name && log.user_name.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(term)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "TOKEN_CALLED":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "BOOKING_CREATED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "USER_LOGIN":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "PROCUREMENT_RECORDED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "PAYMENT_STATUS_UPDATED":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "TOKEN_ARRIVED":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "TOKEN_PROCESSING":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "TOKEN_SKIPPED":
        return "bg-red-100 text-red-800 border-red-300";
      case "CENTRE_CREATED":
      case "CENTRE_UPDATED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "BUYER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "FARMER":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return {
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    } catch {
      return { date: isoStr, time: "" };
    }
  };

  // Quick stats
  const totalEntries = logs.length;
  const loginCount = logs.filter((l) => l.action === "USER_LOGIN").length;
  const tokenCalledCount = logs.filter((l) => l.action === "TOKEN_CALLED").length;
  const procCount = logs.filter((l) => l.action === "PROCUREMENT_RECORDED").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                SIH26032 REQUIREMENT 25
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                Tamper-Evident Audit Ledger
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-1 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#0B2545]" />
              <span>Mandi Operations Audit Trail</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological immutable log of all logins, queue dispatches, weighbridge entries, and financial status updates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-[#0B2545] focus:ring-0"
              />
              <span className="font-semibold">Auto-refresh (10s)</span>
            </label>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="btn-gov-outline text-xs py-1.5 px-3 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Logged Events</span>
            <div className="text-2xl font-black text-[#0B2545] mt-1 font-mono">{totalEntries}</div>
            <span className="text-[10px] text-slate-400">All recorded audit items</span>
          </div>

          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tokens Called</span>
            <div className="text-2xl font-black text-purple-700 mt-1 font-mono">{tokenCalledCount}</div>
            <span className="text-[10px] text-purple-600">Dispatched to counters</span>
          </div>

          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Procurements Logged</span>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{procCount}</div>
            <span className="text-[10px] text-emerald-600">Weighbridge transactions</span>
          </div>

          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Portal Logins</span>
            <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">{loginCount}</div>
            <span className="text-[10px] text-indigo-600">Farmer, Staff & Admin</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-700 mr-1 flex-shrink-0">Filter Action:</span>
            {[
              { label: "All Events", value: "ALL" },
              { label: "Logins", value: "USER_LOGIN" },
              { label: "Tokens Called", value: "TOKEN_CALLED" },
              { label: "Arrivals", value: "TOKEN_ARRIVED" },
              { label: "Processing", value: "TOKEN_PROCESSING" },
              { label: "Procurements", value: "PROCUREMENT_RECORDED" },
              { label: "Payments", value: "PAYMENT_STATUS_UPDATED" },
              { label: "Bookings", value: "BOOKING_CREATED" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => setActionFilter(btn.value)}
                className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap transition ${
                  actionFilter === btn.value
                    ? "bg-[#0B2545] text-white font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545] uppercase tracking-wider font-bold">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-40">Timestamp</th>
                  <th className="p-3 w-44">Action Event</th>
                  <th className="p-3 w-36">Entity Target</th>
                  <th className="p-3 w-44">Initiated By</th>
                  <th className="p-3">Audit Details & Cryptographic Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0B2545] mb-2" />
                      <span>Loading governance audit trail...</span>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <AlertCircle className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                      <p className="font-semibold text-slate-700">No matching audit logs found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Perform operations like calling a token or logging in to generate audit items.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const ts = formatTimestamp(log.created_at);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-700">{ts.date}</div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{ts.time}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-slate-800 font-bold text-[11px]">
                            {log.entity_type}
                          </div>
                          {log.entity_id && (
                            <div className="font-mono text-[10px] text-slate-500">
                              ID: #{log.entity_id}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 text-xs">
                            {log.user_name || "System Automated"}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${getRoleBadge(
                              log.user_role
                            )}`}
                          >
                            {log.user_role || "SYSTEM"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 text-xs leading-relaxed">
                          <p>{log.details || "Action executed successfully"}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified Ledger Entry</span>
                            </span>
                            {log.ip_address && (
                              <span className="font-mono">IP: {log.ip_address}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

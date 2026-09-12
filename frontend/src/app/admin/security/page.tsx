"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { adminApi } from "@/lib/api";
import {
  ShieldCheck, Lock, AlertTriangle, Key, Users,
  Activity, RefreshCw, FileText, CheckCircle2, ShieldAlert
} from "lucide-react";

export default function AdminSecurityPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSecurity = async () => {
    if (!user || user.role !== "ADMIN") return;
    setLoading(true);
    try {
      const data = await adminApi.getSecuritySummary();
      setSummary(data);
    } catch {
      showToast("Unable to load security console data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, [user]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#0B2545] font-serif">
                  State Administration Security & Access Console
                </h1>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RBAC Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Real-time security auditing, role-based boundary enforcement, HMAC-SHA256 signature verification health, and tamper-evident administrative logs.
              </p>
            </div>
            <button
              onClick={loadSecurity}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Posture Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Enforcement Mode</span>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {summary?.rbac_enforcement || "STRICT"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">401/403 HTTP Guards Active</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Total Audit Trail Records</span>
            <p className="text-xl font-black text-[#0B2545] mt-1">
              {summary?.total_audit_logs || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Immutable audit events logged</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Sensitive Actions Tracked</span>
            <p className="text-xl font-black text-amber-700 mt-1">
              {summary?.sensitive_actions_count || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Payouts, refunds & cancellations</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold uppercase block">Registered Identities</span>
            <p className="text-xl font-black text-slate-800 mt-1">
              {summary?.user_demographics?.total_users || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary?.user_demographics?.farmers || 0} Farmers • {summary?.user_demographics?.staff || 0} Staff
            </p>
          </div>
        </div>

        {/* Security Policies In Effect */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2 border-b pb-3 font-serif">
            <Lock className="w-5 h-5 text-emerald-600" />
            Mandatory SIH26032 Data Isolation & Security Safeguards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Secret Leakage</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Passwords, OTP codes, Razorpay secret keys, and unmasked bank account numbers are never exposed in browser bundles, responses, or console outputs.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Staff Centre Assignment Security</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Procurement desk operators are strictly bounded to their assigned mandi centre. Cross-mandi queue tampering is blocked at the backend controller level.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cryptographic HMAC Signatures</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Weighbridge gate fee verifications require server-side HMAC-SHA256 digest checks. Tampered payloads are safely flagged and rejected.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Security Audit Events */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0B2545] flex items-center gap-2 font-serif">
              <Activity className="w-4 h-4 text-[#0B2545]" />
              Recent Security & Administrative Audit Events
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Last 20 System Operations</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Tamper-Evident Security Log...</p>
            </div>
          ) : !summary?.recent_security_events?.length ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No audit events logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Initiated By</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Entity Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {summary.recent_security_events.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {evt.timestamp}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-[#0B2545] font-bold px-2 py-0.5 rounded text-[10px] border border-slate-200">
                          {evt.action}
                        </span>
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-800">
                        {evt.user_name}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          evt.user_role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : evt.user_role === "BUYER"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {evt.user_role}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-600 max-w-md truncate">
                        {evt.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

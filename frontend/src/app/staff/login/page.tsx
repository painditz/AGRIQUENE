"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Building2, Lock, UserCheck, RefreshCw, ArrowRight, ShieldCheck, Scale } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authData = await api.loginBuyer(identifier, password);
      login(authData);
      router.push("/staff/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid Staff credentials. Please verify your Employee ID and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#0B2545] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-6 text-center border-b-2 border-amber-400">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-300">
            <Scale className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full">
            GOV PROCUREMENT OPERATIONS
          </span>
          <h2 className="text-2xl font-black font-serif mt-2">
            Mandi Staff Operational Desk
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Procurement Officers, Weighbridge Operators & Counter Staff
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Staff Employee ID or Mobile
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. BUYER-GZB-01"
              className="w-full p-3 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-[#0B2545]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Desk Authorization Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter operational password"
              className="w-full p-3 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#0B2545]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B2545] hover:bg-[#133E68] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating Desk...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Authorize & Open Operational Desk</span>
              </>
            )}
          </button>

          <div className="pt-3 border-t border-slate-200 text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              Are you an agricultural producer?
            </p>
            <Link
              href="/farmer/login"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>Switch to Farmer Self-Service Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

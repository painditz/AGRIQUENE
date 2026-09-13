"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Smartphone, Lock, ShieldCheck, ArrowRight, RefreshCw, KeyRound, CheckCircle2, User } from "lucide-react";

export default function FarmerLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Credentials Login State
  const [mobileOrUsername, setMobileOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Direct Password / Credentials Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authData = await api.loginFarmerPassword(mobileOrUsername.trim(), password);
      login(authData);
      if (!authData.is_registered) {
        router.push("/farmer/register");
      } else {
        router.push("/farmer/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid mobile number or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl border-2 border-[#0B2545] shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            MINISTRY OF AGRICULTURE & FARMERS WELFARE
          </span>
          <h2 className="text-xl font-bold font-serif mt-1">
            Farmer Self-Service Login
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Access your tokens, live queue position, AI wait time, and DBT payments
          </p>
        </div>

        <div className="bg-slate-50 border-b border-slate-200 p-3 text-center">
          <span className="text-xs font-bold text-[#0B2545] flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#B91C1C]" />
            <span>Farmer Credentials Login (Mobile / PM-KISAN ID)</span>
          </span>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Primary Credentials Login Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  Mobile Number / Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={mobileOrUsername}
                    onChange={(e) => setMobileOrUsername(e.target.value)}
                    placeholder="e.g. 9876543210 or Ramesh"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded text-sm font-mono focus:ring-1 focus:ring-[#0B2545] focus:border-[#0B2545] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0B2545] focus:border-[#0B2545] outline-none"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Demo default: <strong className="text-slate-800 font-mono">farmer123</strong></span>
                  <Link href="/farmer/register" className="text-[#0B2545] font-bold hover:underline">
                    New Farmer? Register
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !mobileOrUsername || !password}
                className="w-full btn-gov-primary py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Farmer Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          {/* Privacy & Security Footnote */}
          <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Government Public Service Portal</span>
            </p>
            <p>
              Need Mandi Staff or Admin login?{" "}
              <Link href="/staff/login" className="text-[#0B2545] font-bold hover:underline">
                Mandi Staff Login
              </Link>
              {" · "}
              <Link href="/admin/login" className="text-[#0B2545] font-bold hover:underline">
                Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

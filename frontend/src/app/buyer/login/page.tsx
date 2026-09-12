"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Building2, Lock, UserCheck, RefreshCw, ArrowRight, Shield } from "lucide-react";
import { DEMO_PRESETS } from "@/lib/constants";

export default function BuyerLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState(DEMO_PRESETS.buyer.empId);
  const [password, setPassword] = useState(DEMO_PRESETS.buyer.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authData = await api.loginBuyer(identifier, password);
      login(authData);
      router.push("/buyer/queue");
    } catch (err: any) {
      setError(err.message || "Invalid Buyer credentials. Try BUYER-GZB-01 / buyer123.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded border-2 border-[#0B2545] shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            GOVERNMENT OPERATIONS CONSOLE
          </span>
          <h2 className="text-xl font-bold font-serif mt-1">
            Buyer & Mandi Staff Login
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Procurement Officers, Weighbridge Operators & APMC Staff
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Employee ID or Mobile Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. BUYER-GZB-01"
              className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono outline-none focus:border-[#0B2545]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Security Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            />
          </div>

          {/* Demo Presets Helper */}
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-[11px] text-blue-900 flex items-center justify-between">
            <span>Demo: <strong>BUYER-GZB-01</strong> / <strong>buyer123</strong></span>
            <button
              type="button"
              onClick={() => {
                setIdentifier(DEMO_PRESETS.buyer.empId);
                setPassword(DEMO_PRESETS.buyer.password);
              }}
              className="text-[#0B2545] font-bold underline text-[10px]"
            >
              Fill Demo
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gov-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Authorize & Open Buyer Desk</span>
              </>
            )}
          </button>

          <div className="pt-3 border-t text-center text-xs text-slate-500 space-y-1">
            <p>
              Looking for State Administration?{" "}
              <Link href="/admin/login" className="text-[#0B2545] font-bold hover:underline">
                Admin Console
              </Link>
            </p>
            <p>
              Are you a farmer?{" "}
              <Link href="/farmer/login" className="text-[#B91C1C] font-bold hover:underline">
                Farmer Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

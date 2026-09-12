"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { ShieldCheck, Lock, UserCheck, RefreshCw, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
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
      const authData = await api.loginAdmin(identifier, password);
      login(authData);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid Admin credentials. Please check your official email and password.");
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
            STATE DIRECTIVE CONSOLE
          </span>
          <h2 className="text-xl font-bold font-serif mt-1">
            State Administrator Login
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Department of Food & Public Distribution | State Director Access
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
              Admin Official Email or Emp ID
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
              className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            />
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
                <ShieldCheck className="w-4 h-4" />
                <span>Enter Administration Console</span>
              </>
            )}
          </button>

          <div className="pt-3 border-t text-center text-xs text-slate-500">
            <Link href="/buyer/login" className="text-[#0B2545] font-bold hover:underline">
              Buyer / Staff Desk Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

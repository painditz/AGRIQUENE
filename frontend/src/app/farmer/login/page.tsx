"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Smartphone, Lock, ShieldCheck, ArrowRight, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react";
import { DEMO_PRESETS } from "@/lib/constants";

export default function FarmerLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mobileNumber, setMobileNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.sendFarmerOTP(mobileNumber);
      setOtpSent(true);
      setSuccessMsg(res.message);
      if (res.mock_otp) {
        setOtp(res.mock_otp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authData = await api.verifyFarmerOTP(mobileNumber, otp);
      login(authData);
      if (!authData.is_registered) {
        router.push("/farmer/register");
      } else {
        router.push("/farmer/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP code. Please enter 123456.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded border-2 border-[#0B2545] shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            MINISTRY OF AGRICULTURE & FARMERS WELFARE
          </span>
          <h2 className="text-xl font-bold font-serif mt-1">
            Farmer Self-Service Login
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Access your tokens, queue position, AI ETA, and DBT payments
          </p>
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

          {!otpSent ? (
            /* Step 1: Enter Mobile Number */
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  10-Digit Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded text-sm font-mono focus:ring-1 focus:ring-[#0B2545] focus:border-[#0B2545] outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  We will send a 6-digit One Time Password (OTP) via SMS.
                </p>
              </div>

              {/* Demo Hint */}
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-[11px] text-blue-900 flex items-center justify-between">
                <span>Demo Farmer: <strong>9876543210</strong></span>
                <button
                  type="button"
                  onClick={() => setMobileNumber(DEMO_PRESETS.farmer.mobile)}
                  className="font-bold text-[#0B2545] underline text-[10px]"
                >
                  Use Demo
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || mobileNumber.length < 10}
                className="w-full btn-gov-primary py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Enter OTP */
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] text-[#0B2545] font-semibold hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-xl font-bold font-mono py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0B2545] focus:border-[#0B2545] outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default developer OTP: <span className="font-bold text-slate-800">123456</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full btn-gov-red py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify OTP & Login</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-xs text-slate-600 hover:text-[#0B2545] font-semibold"
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Security Footnote */}
          <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Government Public Service Portal</span>
            </p>
            <p>
              Need Mandi Staff or Admin login?{" "}
              <Link href="/buyer/login" className="text-[#0B2545] font-bold hover:underline">
                Buyer Login
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

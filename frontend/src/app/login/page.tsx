"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Smartphone, Lock, ShieldCheck, ArrowRight,
  RefreshCw, CheckCircle2, User, Building2, ShoppingCart, AlertCircle
} from "lucide-react";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<"FARMER" | "BUYER" | "ADMIN">("FARMER");
  
  // Farmer OTP login state
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  
  // Staff/Admin password login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Farmer Send OTP
  const handleFarmerSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!mobileNumber || mobileNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendFarmerOTP(mobileNumber);
      setOtpSent(true);
      setSuccessMsg(res.message);
      if (res.mock_otp) {
        setOtp(res.mock_otp);
      }
    } catch (err: any) {
      setError(err.message || "Unable to send login code. Please check your mobile number.");
    } finally {
      setLoading(false);
    }
  };

  // Farmer Verify OTP & Login
  const handleFarmerVerifyOTP = async (e: React.FormEvent) => {
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
      setError(err.message || "The code entered is incorrect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Unified Buyer / Admin / Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let authData;
      if (role === "BUYER") {
        authData = await api.loginBuyer(identifier.trim(), password);
        login(authData);
        router.push("/staff/dashboard");
      } else if (role === "ADMIN") {
        authData = await api.loginAdmin(identifier.trim(), password);
        login(authData);
        router.push("/admin/dashboard");
      } else {
        authData = await api.unifiedLogin({ identifier: identifier.trim(), password });
        login(authData);
        if (authData.role === "ADMIN") router.push("/admin/dashboard");
        else if (authData.role === "BUYER") router.push("/staff/dashboard");
        else router.push("/farmer/dashboard");
      }
    } catch (err: any) {
      setError("Your login details are incorrect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded border-2 border-[#0B2545] shadow-lg overflow-hidden">
        {/* Government Header */}
        <div className="bg-[#0B2545] text-white p-5 text-center border-b-2 border-[#B91C1C]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            MINISTRY OF AGRICULTURE & FARMERS WELFARE
          </span>
          <h1 className="text-xl font-bold font-serif mt-1">
            AGRIQUENE Portal Login
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            National Smart Procurement Queue & AI ETA System
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Role Switcher Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">
              I am logging in as:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRole("FARMER");
                  setError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition ${
                  role === "FARMER"
                    ? "bg-[#0B2545] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>🌾</span>
                <span>Farmer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("BUYER");
                  setError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition ${
                  role === "BUYER"
                    ? "bg-[#0B2545] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>🛒</span>
                <span>Mandi Staff</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("ADMIN");
                  setError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition ${
                  role === "ADMIN"
                    ? "bg-[#0B2545] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>🏢</span>
                <span>Admin</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FARMER LOGIN FLOW */}
          {role === "FARMER" && (
            <>
              {!otpSent ? (
                <form onSubmit={handleFarmerSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                      Enter Mobile Number
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
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-12 pr-3 py-2.5 border border-slate-300 rounded text-xs font-mono font-bold tracking-wider outline-none focus:border-[#0B2545] min-h-[44px]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      A 6-digit verification code will be sent to your phone.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-gov-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFarmerVerifyOTP} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] text-[#0B2545] hover:underline font-semibold"
                      >
                        Change Number
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.trim())}
                      placeholder="Enter 6-digit code"
                      className="w-full p-2.5 border border-slate-300 rounded text-center text-lg font-mono font-bold tracking-widest outline-none focus:border-[#0B2545] min-h-[44px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-gov-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Logging In...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* BUYER & ADMIN LOGIN FLOW */}
          {role !== "FARMER" && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  {role === "BUYER" ? "Employee ID / Mobile Number" : "Administrator Email / Identifier"}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={role === "BUYER" ? "e.g. BUYER-GZB-01" : "e.g. admin@agriquene.gov.in"}
                  className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gov-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {role === "BUYER" ? "Mandi Console" : "Admin Console"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Direct Link to Registration */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600">
              New farmer to the procurement system?{" "}
              <Link href="/farmer/register" className="text-[#0B2545] font-bold hover:underline">
                Register Your Profile & Mandi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

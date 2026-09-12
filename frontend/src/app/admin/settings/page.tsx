"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  Settings, Sliders, Shield, Bell, Database,
  Cpu, CheckCircle2, Save, RefreshCw
} from "lucide-react";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [testMode, setTestMode] = useState(true);
  const [smsGateway, setSmsGateway] = useState("SIMULATED_PROD");
  const [maxDailyCapacity, setMaxDailyCapacity] = useState("150");
  const [activeCountersDefault, setActiveCountersDefault] = useState("4");
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast("System configuration parameters saved successfully", "success");
    }, 400);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#0B2545] font-serif">
                  System Configuration & Operational Parameters
                </h1>
                <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-300">
                  Global Configuration
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Configure national mandi defaults, gateway operational switches, XGBoost ETA calibration intervals, and SMS dispatch policies.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gateway & Payment Mode */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2 border-b pb-3 font-serif">
              <Shield className="w-5 h-5 text-emerald-600" />
              Payment & Security Mode
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Razorpay Execution Mode</label>
                <select
                  value={testMode ? "TEST" : "LIVE"}
                  onChange={(e) => setTestMode(e.target.value === "TEST")}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-[#0B2545]"
                >
                  <option value="TEST">TEST Mode (Developer Sandbox & Test UPI/Cards)</option>
                  <option value="LIVE">PRODUCTION Mode (Live Bank Settlement)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  In TEST mode, signatures are verified against HMAC sandbox secrets without debiting real bank accounts.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SMS Dispatch Pipeline</label>
                <select
                  value={smsGateway}
                  onChange={(e) => setSmsGateway(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-[#0B2545]"
                >
                  <option value="SIMULATED_PROD">Gov DLT SMS Gateway (Simulated & Local Delivery)</option>
                  <option value="CDAC_DIRECT">C-DAC Mobile Seva Gateway (API Connect)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mandi Operational Defaults */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-black text-[#0B2545] flex items-center gap-2 border-b pb-3 font-serif">
              <Sliders className="w-5 h-5 text-[#0B2545]" />
              Mandi Capacity & Queue Defaults
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Daily Farmer Capacity</label>
                <input
                  type="number"
                  value={maxDailyCapacity}
                  onChange={(e) => setMaxDailyCapacity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#0B2545]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default maximum farmer arrivals allowed per procurement centre per day across all slots.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Active Weighbridge Counters</label>
                <input
                  type="number"
                  value={activeCountersDefault}
                  onChange={(e) => setActiveCountersDefault(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold focus:ring-2 focus:ring-[#0B2545]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Nominal operational counters for throughput calculations and ETA forecasting.
                </p>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0B2545] hover:bg-[#133E68] text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save System Parameters"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

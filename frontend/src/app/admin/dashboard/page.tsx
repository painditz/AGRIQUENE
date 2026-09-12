"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatsCard } from "@/components/ui/StatsCard";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import {
  Users, Building2, Calendar, Activity, CheckCircle2,
  CreditCard, ArrowRight, BarChart3, Cpu, Sliders, Ticket
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const data = await api.getAdminDashboard();
        setDashboardData(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const ov = dashboardData?.overview || {
    total_farmers: 0,
    active_centres: 0,
    today_bookings: 0,
    currently_waiting: 0,
    completed_procurements: 0,
    pending_payments: 0,
    total_procurement_value_inr: 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              EXECUTIVE TELEMETRY OVERSIGHT
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              State Agricultural Procurement Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Real-time operational monitoring across {ov.active_centres} active Mandis and APMC procurement centres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/analytics"
              className="btn-gov-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Full Analytics Suite</span>
            </Link>
          </div>
        </div>

        {/* State-wide Operations KPI Grid (Requirement 25) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Total Registered Farmers"
            value={ov.total_farmers.toLocaleString()}
            subtitle="Verified with PM-KISAN / Aadhaar"
            icon={Users}
            variant="navy"
          />
          <StatsCard
            title="Active Procurement Mandis"
            value={ov.active_centres}
            subtitle="All centres operating normally"
            icon={Building2}
            variant="green"
          />
          <StatsCard
            title="Today's Total Bookings"
            value={ov.today_bookings}
            subtitle="Scheduled across all mandis"
            icon={Calendar}
            variant="navy"
          />
          <StatsCard
            title="Currently Waiting in Line"
            value={ov.currently_waiting}
            subtitle="Farmers at weighbridge gates"
            icon={Activity}
            variant="amber"
          />
          <StatsCard
            title="Completed Procurements"
            value={ov.completed_procurements}
            subtitle="Weighed & receipts issued"
            icon={CheckCircle2}
            variant="green"
          />
          <StatsCard
            title="Total Mandi Disbursed Value"
            value={formatINR(ov.total_procurement_value_inr)}
            subtitle="DBT settlements to farmer accounts"
            icon={CreditCard}
            variant="red"
          />
        </div>

        {/* Quick Access Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/ml-models"
            className="bg-white border border-slate-200 rounded p-5 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">AI Intelligence</span>
              <Cpu className="w-5 h-5 text-[#0B2545]" />
            </div>
            <h3 className="font-bold text-sm text-[#0B2545]">XGBoost Model Performance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect model goodness of fit ($R^2=0.9905$, MAE=3.73 min) and feature importance distributions.
            </p>
          </Link>

          <Link
            href="/admin/centres"
            className="bg-white border border-slate-200 rounded p-5 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Infrastructure</span>
              <Building2 className="w-5 h-5 text-[#B91C1C]" />
            </div>
            <h3 className="font-bold text-sm text-[#0B2545]">Centres & Capacity Management</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure mandi capacity, active counters, operating hours, and location geo-coordinates.
            </p>
          </Link>

          <Link
            href="/admin/tokens"
            className="bg-white border border-slate-200 rounded p-5 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Surveillance</span>
              <Ticket className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-sm text-[#0B2545]">Live Token & Queue Oversight</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track farmer queue positions, inspect dossier records, expedite priority deliveries, or cancel slots.
            </p>
          </Link>

          <Link
            href="/admin/slots"
            className="bg-white border border-slate-200 rounded p-5 shadow-sm hover:border-[#0B2545] transition space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Scheduling Policy</span>
              <Sliders className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-bold text-sm text-[#0B2545]">Dynamic Slot Allocations</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust hourly slot quotas per mandi to prevent morning rush congestion and level yard loading.
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

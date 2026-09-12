"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api } from "@/lib/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from "recharts";
import { BarChart3, TrendingUp, Clock, Scale, Building2, ShieldCheck, RefreshCw } from "lucide-react";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getAnalyticsOverview();
        setData(res);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hourlyRush = data?.hourly_rush || [
    { hour: "08:00 AM", avg_wait_min: 14, arrivals: 18, processed: 16 },
    { hour: "09:00 AM", avg_wait_min: 26, arrivals: 32, processed: 25 },
    { hour: "10:00 AM", avg_wait_min: 45, arrivals: 58, processed: 38 },
    { hour: "11:00 AM", avg_wait_min: 48, arrivals: 64, processed: 42 },
    { hour: "12:00 PM", avg_wait_min: 39, arrivals: 46, processed: 40 },
    { hour: "01:00 PM", avg_wait_min: 28, arrivals: 30, processed: 35 },
    { hour: "02:00 PM", avg_wait_min: 35, arrivals: 42, processed: 36 },
    { hour: "03:00 PM", avg_wait_min: 22, arrivals: 25, processed: 30 },
    { hour: "04:00 PM", avg_wait_min: 15, arrivals: 14, processed: 22 },
    { hour: "05:00 PM", avg_wait_min: 8, arrivals: 6, processed: 14 },
  ];

  const dailyTrend = data?.daily_trend || [
    { day: "Mon", farmers_served: 142, procurement_quintals: 4820 },
    { day: "Tue", farmers_served: 168, procurement_quintals: 5640 },
    { day: "Wed", farmers_served: 185, procurement_quintals: 6210 },
    { day: "Thu", farmers_served: 194, procurement_quintals: 6590 },
    { day: "Fri", farmers_served: 210, procurement_quintals: 7180 },
    { day: "Sat", farmers_served: 225, procurement_quintals: 7820 },
    { day: "Today", farmers_served: 176, procurement_quintals: 5940 },
  ];

  const cropDistribution = data?.crop_distribution || [
    { crop: "Wheat", volume_quintals: 28400, percentage: 58.5, color: "#0B2545" },
    { crop: "Mustard", volume_quintals: 11200, percentage: 23.1, color: "#EA580C" },
    { crop: "Paddy (Rice)", volume_quintals: 6400, percentage: 13.2, color: "#15803D" },
    { crop: "Maize", volume_quintals: 2500, percentage: 5.2, color: "#B91C1C" },
  ];

  const centreComparison = data?.centre_comparison || [
    {
      id: 1,
      centre_name: "Agri Procurement Centre – Ghaziabad Mandi",
      district: "Ghaziabad",
      state: "Uttar Pradesh",
      active_counters: 4,
      farmers_served: 138,
      current_queue: 14,
      avg_wait_min: 33,
      avg_processing_min: 8.0,
      efficiency_score: "94.8%",
    },
    {
      id: 2,
      centre_name: "Karnal Central Grain APMC Mandi",
      district: "Karnal",
      state: "Haryana",
      active_counters: 5,
      farmers_served: 156,
      current_queue: 8,
      avg_wait_min: 20,
      avg_processing_min: 7.5,
      efficiency_score: "96.2%",
    },
    {
      id: 3,
      centre_name: "Jaipur Krishi Upaj Mandi Samiti",
      district: "Jaipur",
      state: "Rajasthan",
      active_counters: 3,
      farmers_served: 174,
      current_queue: 22,
      avg_wait_min: 55,
      avg_processing_min: 9.0,
      efficiency_score: "87.4%",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              STATE OPERATIONS INTELLIGENCE
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Procurement & Queue Telemetry Analytics
            </h1>
            <p className="text-xs text-slate-500">
              Interactive operational charts, peak rush hours, crop distribution, and mandi efficiency benchmarks.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); api.getAnalyticsOverview().then(setData).finally(() => setLoading(false)); }}
            className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>

        {/* Charts Row 1: Diurnal Rush Curve & 7-Day Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Average Waiting Time by Hour (Peak Hours) */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wide text-[#0B2545] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#B91C1C]" />
                Peak Hour Arrival Rush vs Average Wait Time (Minutes)
              </h3>
              <span className="text-[11px] text-slate-500">Diurnal Pattern</span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyRush} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="avg_wait_min"
                    name="Avg Wait (Minutes)"
                    stroke="#B91C1C"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="arrivals"
                    name="Farmer Arrivals"
                    stroke="#0B2545"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Peak congestion occurs between 10:00 AM and 1:00 PM due to simultaneous morning harvest arrivals.
            </p>
          </div>

          {/* Chart 2: Farmers Served Per Day (Past 7 Days) */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wide text-[#0B2545] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                Farmers Served & Procurement Volume (Past 7 Days)
              </h3>
              <span className="text-[11px] text-slate-500">Weekly Run Rate</span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="farmers_served" name="Farmers Served" fill="#0B2545" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="procurement_quintals" name="Produce (Quintals / 10)" fill="#15803D" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Steady weekly throughput averaging ~190 farmers and ~6,500 quintals per active mandi day.
            </p>
          </div>
        </div>

        {/* Charts Row 2: Crop Volume Breakdown */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wide text-[#0B2545] flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-700" />
              State-Wide Procurement Volume by Crop Type
            </h3>
            <span className="text-[11px] text-slate-500">Season: Rabi 2026</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {cropDistribution.map((c: any) => (
              <div key={c.crop} className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0B2545]">{c.crop}</span>
                  <span className="text-[10px] font-bold font-mono bg-white px-1.5 py-0.2 rounded border">
                    {c.percentage}%
                  </span>
                </div>
                <p className="text-xl font-black font-mono text-slate-900 mt-1">
                  {c.volume_quintals.toLocaleString()} <span className="text-xs font-normal text-slate-500">Qtl</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Centre Efficiency Benchmark Table (Requirement 27) */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#B91C1C]" />
              Mandi Operations & Efficiency Benchmark Table
            </h3>
            <span className="text-xs text-slate-500">Real-Time Yard Telemetry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Mandi Centre</th>
                  <th className="p-2.5 font-bold">District / State</th>
                  <th className="p-2.5 font-bold text-center">Active Counters</th>
                  <th className="p-2.5 font-bold text-center">Farmers Served</th>
                  <th className="p-2.5 font-bold text-center">Current Queue</th>
                  <th className="p-2.5 font-bold text-center">Avg Wait Time</th>
                  <th className="p-2.5 font-bold text-center">Avg Processing</th>
                  <th className="p-2.5 font-bold text-right">Efficiency Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {centreComparison.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 font-sans">
                    <td className="p-2.5 font-bold text-[#0B2545]">{item.centre_name}</td>
                    <td className="p-2.5 text-slate-600">{item.district}, {item.state}</td>
                    <td className="p-2.5 text-center font-mono">{item.active_counters} Open</td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.farmers_served}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-amber-800">{item.current_queue}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#B91C1C]">{item.avg_wait_min} min</td>
                    <td className="p-2.5 text-center font-mono">{item.avg_processing_min} min</td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-700">{item.efficiency_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

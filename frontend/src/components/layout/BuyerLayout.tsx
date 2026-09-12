"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Activity, Users, Scale, Sliders, BarChart3,
  Building2, CheckCircle2, Play, Lock, ArrowLeft, ShieldCheck
} from "lucide-react";
import { useQueueSocket } from "@/context/QueueSocketContext";

interface BuyerLayoutProps {
  children: React.ReactNode;
}

export function BuyerLayout({ children }: BuyerLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isConnected } = useQueueSocket();

  const buyerNav = [
    { name: "Live Queue Manager", href: "/buyer/queue", icon: Activity, badge: "Desk 1" },
    { name: "Centre Dashboard", href: "/buyer/dashboard", icon: Building2 },
    { name: "Procurement / Weighing", href: "/buyer/procurement", icon: Scale },
    { name: "Active Counters", href: "/buyer/counters", icon: Sliders },
  ];

  // RBAC: Guard Mandi Staff / Buyer routes
  if (!user || (user.role !== "BUYER" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="bg-[#0B2545] text-white py-2.5 px-4 border-b border-[#1E3A8A] shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">
              Department of Food & Public Distribution | Mandi Operational Desk
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              Staff Only
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg border-2 border-[#0B2545] p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-blue-50 border-2 border-[#0B2545] rounded-full flex items-center justify-center mx-auto text-[#0B2545]">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B2545] bg-blue-100 px-2 py-0.5 rounded">
                OPERATIONAL DESK AUTHENTICATION
              </span>
              <h2 className="text-xl font-bold text-[#0B2545] font-serif mt-2">
                Mandi Staff Clearance Required
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                You are currently logged in as{" "}
                <strong className="text-[#0B2545]">{user ? user.role : "GUEST"}</strong>.
                Weighbridge procurement desks and queue advancement controls require official procurement officer credentials.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                href="/buyer/login"
                className="flex-1 bg-[#0B2545] hover:bg-[#133E68] text-white py-2.5 px-4 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Staff Sign In</span>
              </Link>

              <Link
                href={user?.role === "FARMER" ? "/farmer/dashboard" : "/"}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 py-2.5 px-4 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{user?.role === "FARMER" ? "Farmer Dashboard" : "Return to Portal"}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mandiDisplayName = user?.centreName || "Procurement Operations Centre";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Buyer Header Bar */}
      <div className="bg-[#0B2545] text-white py-2 px-4 border-b border-[#1E3A8A] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#B91C1C] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
              GOV OPERATIONAL DESK
            </span>
            <span className="text-xs font-bold text-slate-100">
              {mandiDisplayName} (Counter #1)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 live-pulse" : "bg-rose-400"}`} />
              {isConnected ? "Telemetry Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Buyer Left Menu */}
          <aside className="md:col-span-1 space-y-4">
            <div className="bg-white rounded border border-slate-300 overflow-hidden shadow-sm">
              <div className="bg-[#1E293B] text-white px-4 py-2.5 font-bold text-xs uppercase tracking-wider">
                Staff Operations Deck
              </div>
              <nav className="p-2 space-y-1">
                {buyerNav.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition ${
                        isActive
                          ? "bg-[#0B2545] text-white font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isActive ? "bg-amber-400 text-slate-900 font-bold" : "bg-slate-200 text-slate-700"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Mandi Notice */}
            <div className="bg-white border border-slate-200 rounded p-4 text-xs space-y-2">
              <p className="font-bold text-[#0B2545] border-b pb-1">Operational Protocol</p>
              <p className="text-slate-600 text-[11px]">
                1. Call token when counter is ready.
              </p>
              <p className="text-slate-600 text-[11px]">
                2. Verify moisture % using certified probe before weighing.
              </p>
              <p className="text-slate-600 text-[11px]">
                3. Direct Benefit Transfer (DBT) triggers immediately on procurement submission.
              </p>
            </div>
          </aside>

          {/* Buyer Content Area */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}

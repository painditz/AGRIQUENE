"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Users, Scale, Sliders, BarChart3,
  Building2, CheckCircle2, Play
} from "lucide-react";
import { useQueueSocket } from "@/context/QueueSocketContext";

interface BuyerLayoutProps {
  children: React.ReactNode;
}

export function BuyerLayout({ children }: BuyerLayoutProps) {
  const pathname = usePathname();
  const { isConnected } = useQueueSocket();

  const buyerNav = [
    { name: "Live Queue Manager", href: "/buyer/queue", icon: Activity, badge: "Desk 1" },
    { name: "Centre Dashboard", href: "/buyer/dashboard", icon: Building2 },
    { name: "Procurement / Weighing", href: "/buyer/procurement", icon: Scale },
    { name: "Active Counters", href: "/buyer/counters", icon: Sliders },
  ];

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
              Agri Procurement Centre – Ghaziabad Mandi (Counter #1)
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

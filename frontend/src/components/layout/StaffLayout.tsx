"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Activity, Users, Scale, Sliders, FileText,
  Building2, CheckCircle2, Lock, ArrowLeft, ShieldCheck,
  Bell, Ticket, ScrollText, LogOut
} from "lucide-react";
import { useQueueSocket } from "@/context/QueueSocketContext";

interface StaffLayoutProps {
  children: React.ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isConnected } = useQueueSocket();

  const staffNav = [
    { name: "Live Queue Manager", href: "/staff/queue", icon: Activity, badge: "Live" },
    { name: "Centre Dashboard", href: "/staff/dashboard", icon: Building2 },
    { name: "Procurement / Weighing", href: "/staff/procurement", icon: Scale },
    { name: "Active Counters", href: "/staff/counters", icon: Sliders },
    { name: "Farmer Records", href: "/staff/farmers", icon: Users },
    { name: "Token Processing", href: "/staff/tokens", icon: Ticket },
    { name: "Procurement Records", href: "/staff/records", icon: ScrollText },
    { name: "Notifications", href: "/staff/notifications", icon: Bell },
  ];

  // RBAC: Strict protection for Staff Operations
  if (!user || (user.role !== "BUYER" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="bg-[#0B2545] text-white py-2.5 px-4 border-b border-[#1E3A8A] shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">
              Department of Food & Public Distribution | Mandi Operational Desk
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              Staff Clearance Required
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border-2 border-[#0B2545] p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B2545] bg-blue-100 px-2 py-0.5 rounded">
                OPERATIONAL DESK ACCESS RESTRICTED
              </span>
              <h2 className="text-xl font-bold text-[#0B2545] font-serif mt-2">
                Staff Authentication Required
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                You are currently signed in as{" "}
                <strong className="text-[#0B2545]">{user ? user.role : "GUEST"}</strong>.
                Weighbridge procurement desks and queue management actions are reserved exclusively for authorized mandi personnel.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                href="/staff/login"
                className="flex-1 bg-[#0B2545] hover:bg-[#133E68] text-white py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Staff Sign In</span>
              </Link>

              <Link
                href={user?.role === "FARMER" ? "/farmer/dashboard" : "/"}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
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

  const mandiDisplayName = user?.centreName || "Procurement Operations Centre (Assigned)";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Staff Operational Header */}
      <div className="bg-[#0B2545] text-white py-2 px-4 border-b border-[#1E3A8A] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#B91C1C] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
              GOV OPERATIONAL DESK
            </span>
            <span className="text-xs font-bold text-slate-100 hidden sm:inline">
              {mandiDisplayName}
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold bg-[#133E68] px-2 py-0.5 rounded">
              Counter #1
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="text-slate-300 text-[11px]">
                {isConnected ? "WS Connected" : "Polling Sync"}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="font-bold text-slate-200 hidden md:inline">
                {user.fullName || "Staff Officer"}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/staff/login");
                }}
                title="Sign Out"
                className="text-slate-400 hover:text-red-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Operational Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 min-w-max">
          {staffNav.map((item) => {
            const isActive = pathname === item.href || (item.href === "/staff/queue" && pathname === "/buyer/queue") || (item.href === "/staff/procurement" && pathname === "/buyer/procurement");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-[#0B2545] text-[#0B2545] bg-blue-50/50"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0B2545]" : "text-slate-500"}`} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? "bg-[#0B2545] text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Staff Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck, LayoutDashboard, Building2, Calendar,
  Users, UserCog, BarChart3, Cpu, Settings, AlertTriangle, ArrowLeft, Lock, CreditCard, Ticket
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const adminNav = [
    { name: "Executive Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Live Token Oversight", href: "/admin/tokens", icon: Ticket, badge: "Live" },
    { name: "DBT & Payments", href: "/admin/payments", icon: CreditCard, badge: "PFMS" },
    { name: "Operations Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "XGBoost ML Models", href: "/admin/ml-models", icon: Cpu, badge: "AI Core" },
    { name: "Procurement Centres", href: "/admin/centres", icon: Building2 },
    { name: "Slot Scheduling", href: "/admin/slots", icon: Calendar },
    { name: "Mandi Staff / Buyers", href: "/admin/buyers", icon: UserCog },
    { name: "Farmer Registry", href: "/admin/farmers", icon: Users },
    { name: "System Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck, badge: "SIH-25" },
  ];

  // Access Control: Block unauthorized users before rendering admin components
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="bg-[#0B2545] text-white py-2.5 px-4 border-b border-[#1E3A8A] shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">
              Department of Food & Public Distribution | State Security Console
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              Restricted Area
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg border-2 border-[#B91C1C] p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 border-2 border-[#B91C1C] rounded-full flex items-center justify-center mx-auto text-[#B91C1C]">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C] bg-red-100 px-2 py-0.5 rounded">
                SECURITY CLEARANCE REQUIRED
              </span>
              <h2 className="text-xl font-bold text-[#0B2545] font-serif mt-2">
                Administrator Access Restricted
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                You are currently logged in as{" "}
                <strong className="text-[#0B2545]">{user ? user.role : "GUEST"}</strong>.
                This administration console and its audit ledgers are strictly reserved for state directive officers and authorized administrative personnel.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                href="/admin/login"
                className="flex-1 bg-[#0B2545] hover:bg-[#133E68] text-white py-2.5 px-4 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Sign In</span>
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Admin Top Header */}
      <div className="bg-[#0B2545] text-white py-2 px-4 border-b border-[#1E3A8A] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#B91C1C] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
              STATE DIRECTIVE CONSOLE
            </span>
            <span className="text-xs font-bold text-slate-100">
              Department of Food & Public Distribution | Master Control
            </span>
          </div>
          <span className="text-xs text-amber-300 font-mono font-bold">
            Administrator: {user.fullName}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Admin Sidebar */}
          <aside className="md:col-span-1 space-y-4">
            <div className="bg-white rounded border border-slate-300 overflow-hidden shadow-sm">
              <div className="bg-[#0B2545] text-white px-4 py-2.5 font-bold text-xs uppercase tracking-wider">
                Administration Master Deck
              </div>
              <nav className="p-2 space-y-1">
                {adminNav.map((item) => {
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
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Admin Main Body */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}

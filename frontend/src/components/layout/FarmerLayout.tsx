"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Home, CalendarPlus, Activity, FileCheck2, CreditCard,
  History, Bell, User, MapPin, MessageSquare
} from "lucide-react";
import { SMSPreviewModal } from "../ui/SMSPreviewModal";

interface FarmerLayoutProps {
  children: React.ReactNode;
}

export function FarmerLayout({ children }: FarmerLayoutProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showSMSModal, setShowSMSModal] = useState(false);

  const farmerName =
    user?.fullName && user.fullName !== "New Farmer" ? user.fullName : "Farmer Account";

  const navItems: { name: string; href: string; icon: any; badge?: string }[] = [
    { name: "Dashboard", href: "/farmer/dashboard", icon: Home },
    { name: "Book Slot", href: "/farmer/book", icon: CalendarPlus },
    { name: "Live Queue", href: "/farmer/queue", icon: Activity },
    { name: "Mandi Centres", href: "/farmer/centres", icon: MapPin },
    { name: "Procurement", href: "/farmer/procurement", icon: FileCheck2 },
    { name: "DBT Payments", href: "/farmer/payments", icon: CreditCard },
    { name: "History", href: "/farmer/history", icon: History },
    { name: "Notifications", href: "/farmer/notifications", icon: Bell },
  ];

  // Mobile Bottom Nav items (Requirement 34: Home, Book, Queue, Procurement, Profile)
  const mobileBottomItems = [
    { name: "Home", href: "/farmer/dashboard", icon: Home },
    { name: "Book", href: "/farmer/book", icon: CalendarPlus },
    { name: "Queue", href: "/farmer/queue", icon: Activity, highlight: true },
    { name: "Receipts", href: "/farmer/history", icon: FileCheck2 },
    { name: "Payments", href: "/farmer/payments", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 md:pb-0">
      {/* Farmer Subheader */}
      <div className="bg-[#0B2545] text-white py-2 px-4 border-b border-[#133E68] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              🌾 Farmer Self-Service Portal
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">|</span>
            <span className="text-slate-300 text-xs hidden sm:inline font-semibold">
              {farmerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick SMS Log View Trigger */}
            <button
              onClick={() => setShowSMSModal(true)}
              className="bg-[#133E68] hover:bg-[#1E4E7A] text-amber-300 text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5 transition"
              title="View SMS Message Alerts"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS Log</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Desktop Left Sidebar */}
          <aside className="hidden md:block md:col-span-1 space-y-4">
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-[#0B2545] text-white px-4 py-2.5 font-bold text-xs uppercase tracking-wide">
                Farmer Services Menu
              </div>
              <nav className="p-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition ${
                        isActive
                          ? "bg-slate-100 text-[#0B2545] font-bold border-l-4 border-[#0B2545]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#0B2545]" : "text-slate-500"}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="bg-[#B91C1C] text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mandi Quick Helpline Card */}
            <div className="bg-amber-50 border border-amber-300 rounded p-3.5 text-xs text-amber-950">
              <p className="font-bold flex items-center gap-1 text-[#0B2545]">
                📍 Target Mandi Centre:
              </p>
              <p className="font-semibold mt-1">Agri Procurement Centre – Ghaziabad Mandi</p>
              <p className="text-[11px] text-slate-600 mt-1">Gate Open: 08:00 AM – 06:00 PM</p>
              <p className="text-[11px] text-amber-800 font-bold mt-1">Helpline: 1800-180-1551</p>
            </div>
          </aside>

          {/* Main Farmer Page Content */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Fixed Navigation (Requirement 34) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#0B2545] shadow-lg flex items-center justify-around py-1.5 px-2">
        {mobileBottomItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition ${
                isActive
                  ? "text-[#0B2545]"
                  : "text-slate-500 hover:text-slate-800"
              } ${item.highlight ? "text-[#B91C1C]" : ""}`}
            >
              <Icon className={`w-5 h-5 ${item.highlight ? "animate-pulse" : ""}`} />
              <span className="mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* SMS Log Modal */}
      <SMSPreviewModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        farmerMobile="9876543210"
      />
    </div>
  );
}

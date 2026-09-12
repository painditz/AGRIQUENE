"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Home, HelpCircle, MapPin, Calendar, Activity,
  FileText, ShieldCheck, Menu, X, Users, Layers
} from "lucide-react";

export function MainNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: t("home"), href: "/", icon: Home },
    { name: t("howItWorks"), href: "/how-it-works", icon: HelpCircle },
    { name: t("findCentre"), href: "/centres", icon: MapPin },
    { name: "Farmer Services", href: "/farmer/dashboard", icon: Calendar, highlight: true },
    { name: "Buyer Operations", href: "/buyer/dashboard", icon: Activity },
    { name: "Admin Console", href: "/admin/dashboard", icon: ShieldCheck },
  ];

  return (
    <nav className="bg-[#0B2545] text-white border-b-2 border-[#B91C1C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-11">
          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide transition border-b-2 ${
                    isActive
                      ? "bg-[#133E68] text-amber-300 border-amber-400"
                      : "text-slate-200 hover:bg-[#133E68] hover:text-white border-transparent"
                  } ${item.highlight ? "text-amber-200" : ""}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Shortcuts on Right */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Link
              href="/farmer/queue"
              className="bg-[#B91C1C] hover:bg-[#991B1B] text-white px-2.5 py-1 rounded font-bold flex items-center gap-1 shadow-sm"
            >
              <Activity className="w-3 h-3 animate-pulse" />
              <span>LIVE QUEUE #128</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-200">PORTAL MENU</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-200 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-slate-700 space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                    isActive ? "bg-[#133E68] text-amber-300" : "text-slate-200 hover:bg-[#133E68]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

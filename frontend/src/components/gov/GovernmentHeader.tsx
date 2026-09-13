"use client";

import React from "react";
import Link from "next/link";
import { GovEmblem } from "./GovEmblem";
import { APP_CONFIG } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LogOut, UserCircle2, ArrowRight } from "lucide-react";

export function GovernmentHeader() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Portal Branding */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <GovEmblem className="w-13 h-13 flex-shrink-0" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2545] font-serif">
                AGRIQUENE
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#B91C1C] border border-[#B91C1C] px-1.5 py-0.2 rounded">
                SIH 2026
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 tracking-wide">
              {APP_CONFIG.portalTitle}
            </p>
            <p className="text-[11px] text-slate-500 font-medium italic">
              "{APP_CONFIG.tagline}"
            </p>
          </div>
        </Link>

        {/* Right side: Role Badges or Login Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs">
              <UserCircle2 className="w-5 h-5 text-[#0B2545]" />
              <div>
                <p className="font-bold text-[#0B2545]">{user.fullName}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Role: <span className="font-semibold text-[#B91C1C]">{user.role === "BUYER" || user.role === "MANDI_OFFICER" ? "MANDI OFFICER / STAFF" : user.role}</span>
                  {user.role === "FARMER" && user.farmerIdCard && ` | ID: ${user.farmerIdCard}`}
                  {user.centreName && ` | ${user.centreName}`}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-red-600 hover:text-red-800 p-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/farmer/login"
                className="btn-gov-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <span>{t("farmerLogin")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/buyer/login"
                className="btn-gov-outline text-xs py-2 px-3.5"
              >
                {t("buyerLogin")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

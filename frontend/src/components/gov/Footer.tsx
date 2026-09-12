"use client";

import React from "react";
import Link from "next/link";
import { GovEmblem } from "./GovEmblem";
import { APP_CONFIG } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";
import { Phone, Mail, ShieldAlert, Heart, ExternalLink } from "lucide-react";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0B2545] text-slate-300 text-xs border-t-4 border-[#15803D]">
      {/* Top Banner with Tricolor Highlights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About Agriquene */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <GovEmblem className="w-10 h-10" />
              <span className="text-xl font-bold text-white font-serif tracking-tight">
                AGRIQUENE
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {t("footerDisclaimer")}
            </p>
            <div className="text-[11px] text-amber-300 font-semibold">
              Smart India Hackathon (SIH 2026) Project
            </div>
          </div>

          {/* Col 2: Farmer Services */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-3 border-b border-slate-700 pb-1.5 text-xs">
              Farmer Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/farmer/login" className="hover:text-amber-300 transition">
                  OTP Login / Registration
                </Link>
              </li>
              <li>
                <Link href="/farmer/book" className="hover:text-amber-300 transition">
                  Book Procurement Slot
                </Link>
              </li>
              <li>
                <Link href="/farmer/queue" className="hover:text-amber-300 transition">
                  Track Live Mandi Queue
                </Link>
              </li>
              <li>
                <Link href="/farmer/centres" className="hover:text-amber-300 transition">
                  Compare Mandi Workloads & ETA
                </Link>
              </li>
              <li>
                <Link href="/farmer/payments" className="hover:text-amber-300 transition">
                  DBT Payment Status
                </Link>
              </li>
              <li>
                <Link href="/farmer/history" className="hover:text-amber-300 transition">
                  Procurement History & Receipts
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Mandi & Gov Operations */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-3 border-b border-slate-700 pb-1.5 text-xs">
              Centre & Admin Operations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/buyer/login" className="hover:text-amber-300 transition">
                  Buyer / Staff Dashboard
                </Link>
              </li>
              <li>
                <Link href="/buyer/queue" className="hover:text-amber-300 transition">
                  Live Queue Control Deck
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-amber-300 transition">
                  State Administration Console
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-amber-300 transition">
                  Operations Analytics & Recharts
                </Link>
              </li>
              <li>
                <Link href="/admin/ml-models" className="hover:text-amber-300 transition">
                  XGBoost ETA Model Telemetry
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Official Helpline & Support */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-3 border-b border-slate-700 pb-1.5 text-xs">
              Kisan Support & Helpdesk
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Toll-Free Helpline</p>
                  <p className="text-amber-300 font-bold text-sm">1800-180-1551</p>
                  <p className="text-slate-400 text-[10px]">24x7 Agricultural Assistance</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">Email Support</p>
                  <p className="text-slate-300 text-xs">support@agriquene.gov.in</p>
                </div>
              </div>

              <div className="pt-2">
                <span className="bg-emerald-900/60 border border-emerald-500 text-emerald-300 px-2 py-1 rounded text-[11px] block text-center font-medium">
                  Low-Data / SMS Fallback Enabled
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & institutional disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>© 2026 AGRIQUENE National Portal. All Rights Reserved. Built for Smart India Hackathon.</p>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-white">Help & FAQ</Link>
            <span>•</span>
            <Link href="/about" className="hover:text-white">About System</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white">Accessibility Statement</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

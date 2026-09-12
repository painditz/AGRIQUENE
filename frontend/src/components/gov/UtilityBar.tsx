"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Phone, Globe, Eye, User } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

export function UtilityBar() {
  const { lang, setLang, t, fontSize, setFontSize, highContrast, setHighContrast } = useLanguage();

  return (
    <div className="bg-[#0B2545] text-white text-xs border-b border-[#1E3A8A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Ministry & Gov Info */}
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-wider text-slate-200">
            {t("govIndia")}
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">
            {t("portalDesc")}
          </span>
        </div>

        {/* Right: Accessibility, Language, Helpline & Shortcuts */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Toll Free Helpline */}
          <div className="hidden lg:flex items-center gap-1 text-amber-300 font-medium">
            <Phone className="w-3.5 h-3.5" />
            <span>1800-180-1551</span>
          </div>

          {/* Text Size Scaling Controls */}
          <div className="flex items-center gap-1 bg-[#133E68] px-2 py-0.5 rounded text-[11px]">
            <span className="text-slate-300 mr-1">{t("fontSize")}:</span>
            <button
              onClick={() => setFontSize("normal")}
              className={`px-1 font-bold ${fontSize === "normal" ? "text-amber-400 underline" : "text-white"}`}
              title="Standard Font Size"
            >
              A
            </button>
            <button
              onClick={() => setFontSize("large")}
              className={`px-1 font-bold ${fontSize === "large" ? "text-amber-400 underline" : "text-white"}`}
              title="Large Font Size"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize("x-large")}
              className={`px-1 font-bold ${fontSize === "x-large" ? "text-amber-400 underline" : "text-white"}`}
              title="Extra Large Font Size"
            >
              A++
            </button>
          </div>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="flex items-center gap-1 bg-[#133E68] hover:bg-[#1E4E7A] px-2 py-0.5 rounded text-[11px] text-slate-200"
            title="Toggle High Contrast"
          >
            <Eye className="w-3 h-3" />
            <span>{t("contrast")}</span>
          </button>

          {/* Language Selector Toggle */}
          <div className="flex items-center gap-1 bg-[#133E68] px-2 py-0.5 rounded text-[11px]">
            <Globe className="w-3 h-3 text-amber-400" />
            <button
              onClick={() => setLang("en")}
              className={`font-semibold ${lang === "en" ? "text-amber-300 underline" : "text-slate-300 hover:text-white"}`}
            >
              English
            </button>
            <span className="text-slate-400">/</span>
            <button
              onClick={() => setLang("hi")}
              className={`font-semibold ${lang === "hi" ? "text-amber-300 underline" : "text-slate-300 hover:text-white"}`}
            >
              हिन्दी
            </button>
          </div>

          {/* Quick Login links */}
          <div className="flex items-center gap-2 border-l border-[#1E3A8A] pl-3">
            <Link
              href="/farmer/login"
              className="text-slate-200 hover:text-amber-300 font-medium transition"
            >
              {t("farmerLogin")}
            </Link>
            <span className="text-slate-400">|</span>
            <Link
              href="/buyer/login"
              className="text-slate-300 hover:text-white transition"
            >
              {t("buyerLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

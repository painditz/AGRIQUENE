"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  CalendarPlus, Ticket, Activity, Cpu, Scale, CreditCard,
  ArrowRight, ShieldCheck, CheckCircle2, Clock, MapPin,
  TrendingUp, Phone, MessageSquare, AlertCircle, Sparkles
} from "lucide-react";
import { APP_CONFIG, DEMO_PRESETS } from "@/lib/constants";

export default function HomePage() {
  const { t } = useLanguage();

  const serviceCards = [
    {
      title: "1. Book a Slot",
      desc: "Choose your preferred procurement centre, select crop type, and reserve a convenient date and time window.",
      icon: CalendarPlus,
      href: "/farmer/book",
      badge: "Fast 2-Min Booking"
    },
    {
      title: "2. Get Your Token",
      desc: "Receive an official government digital token number instantly upon booking with slot verification.",
      icon: Ticket,
      href: "/farmer/dashboard",
      badge: "Instant Allocation"
    },
    {
      title: "3. Track Live Queue",
      desc: "Follow the live queue movement from your home. Watch tokens advance in real-time as buyers weigh produce.",
      icon: Activity,
      href: "/farmer/queue",
      badge: "Real-Time WebSocket"
    },
    {
      title: "4. AI-Powered ETA",
      desc: "XGBoost machine learning calculates precise waiting-time forecasts and optimal departure times.",
      icon: Cpu,
      href: "/farmer/dashboard",
      badge: "94% Accuracy"
    },
    {
      title: "5. Track Procurement",
      desc: "Digital weighbridge verification, automatic crop quality grading, moisture testing, and MSP calculation.",
      icon: Scale,
      href: "/farmer/procurement",
      badge: "Transparent Weighing"
    },
    {
      title: "6. Track DBT Payment",
      desc: "Real-time Direct Benefit Transfer (PFMS / Aadhaar DBT) payment tracking straight to your bank account.",
      icon: CreditCard,
      href: "/farmer/payments",
      badge: "Direct DBT Transfer"
    },
  ];

  const processSteps = [
    { num: "01", name: t("stepRegister"), desc: "Verify mobile with OTP" },
    { num: "02", name: t("stepCentre"), desc: "Compare nearby mandis" },
    { num: "03", name: t("stepBook"), desc: "Pick recommended slot" },
    { num: "04", name: t("stepToken"), desc: "Receive token (#128)" },
    { num: "05", name: t("stepTrack"), desc: "Monitor live queue & ETA" },
    { num: "06", name: t("stepProcure"), desc: "Weighing & quality check" },
    { num: "07", name: t("stepPayment"), desc: "DBT payment credited" },
  ];

  const whyAgriquene = [
    { title: "Less Waiting Time", desc: "Reduces farmer wait times at mandi gates from 6–10 hours down to under 45 minutes." },
    { title: "Better Transit Planning", desc: "Dynamic 'When Should I Leave?' departure alerts prevent unnecessary premature travel." },
    { title: "Zero Overnight Campouts", desc: "Farmers arrive exactly when their token is approaching instead of sleeping overnight on tractor trolleys." },
    { title: "Transparent Procurement", desc: "Digitally recorded net weights, moisture percentages, and MSP values eliminate unauthorized deductions." },
    { title: "Faster Official Information", desc: "Instant automated SMS alerts update farmers even on basic 2G feature phones." },
    { title: "Optimized Mandi Operations", desc: "Centres balance workload across active counters and prevent unmanageable vehicle gridlock." }
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section (Official Public Service Visual Reference) */}
      <section className="bg-gradient-to-b from-[#0B2545] to-[#133E68] text-white py-12 sm:py-16 border-b-4 border-[#EA580C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 bg-[#1E3A8A]/80 border border-amber-400/40 text-amber-300 px-3 py-1 rounded text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart India Hackathon 2026 Initiative</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight font-serif">
                {t("heroHeadline")}
              </h1>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                {t("heroSubheading")}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/farmer/login"
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-sm px-6 py-3 rounded shadow-md flex items-center gap-2 transition active:scale-95"
                >
                  <span>{t("btnFarmerLogin")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/centres"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold text-sm px-5 py-3 rounded transition flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span>{t("btnFindCentre")}</span>
                </Link>
              </div>

              {/* Live Ticker Bar */}
              <div className="pt-3 border-t border-slate-600/60 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
                  Live Mandi Feeds:
                </span>
                <span>Ghaziabad Mandi: <strong className="text-white">14 in queue (ETA ~33 min)</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Karnal APMC: <strong className="text-white">8 in queue (ETA ~20 min)</strong></span>
              </div>
            </div>

            {/* Right Hero Live Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="bg-white text-slate-900 rounded border-2 border-amber-400 shadow-xl overflow-hidden">
                <div className="bg-[#0B2545] text-white p-3.5 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#B91C1C]" />
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Live Queue Telemetry Demo
                    </span>
                  </div>
                  <span className="bg-[#15803D] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Serving #114
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-500">
                        Target Demo Mandi
                      </p>
                      <p className="text-sm font-bold text-[#0B2545]">
                        Agri Procurement Centre – Ghaziabad
                      </p>
                      <p className="text-xs text-slate-600">Farmer: Ramesh Kumar Sharma</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                        TOKEN #128
                      </span>
                      <p className="text-xs font-bold text-slate-700 mt-1">Position: #14</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        AI Estimated Wait
                      </p>
                      <p className="text-2xl font-black text-[#0B2545] font-mono">
                        33 <span className="text-xs font-semibold text-slate-600">Min</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Expected Turn
                      </p>
                      <p className="text-xl font-black text-[#B91C1C] font-mono">
                        11:42 AM
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded text-xs text-emerald-950 flex items-center justify-between">
                    <span>Recommended Departure:</span>
                    <strong className="font-mono text-sm text-[#0B2545]">11:00 AM</strong>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <Link
                      href="/farmer/queue"
                      className="btn-gov-primary flex-1 text-center text-xs py-2 font-bold"
                    >
                      Open Live Queue Tracker
                    </Link>
                    <Link
                      href="/farmer/book"
                      className="btn-gov-outline flex-1 text-center text-xs py-2 font-bold"
                    >
                      Book New Slot
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Cards (Requirement 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-serif">
            Digital Agricultural Procurement Services
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            End-to-end transparent mandi workflow engineered for Indian farmers, procurement officers, and state food civil supplies departments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="gov-card flex flex-col justify-between hover:border-[#0B2545] transition shadow-sm hover:shadow-md"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded bg-slate-100 text-[#0B2545]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0B2545] border border-blue-200 px-2 py-0.5 rounded">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0B2545]">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                  <Link
                    href={card.href}
                    className="text-xs font-bold text-[#0B2545] hover:text-[#B91C1C] flex items-center gap-1.5 transition"
                  >
                    <span>Access Service</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7-Step Process Flow (Requirement 6) */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-2 mb-8">
            <h2 className="text-2xl font-extrabold text-[#0B2545] font-serif">
              Simple 7-Step Procurement Journey
            </h2>
            <p className="text-xs text-slate-600">
              From mobile registration to bank account DBT credit without uncertainty.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {processSteps.map((step, idx) => (
              <div
                key={step.num}
                className="bg-slate-50 border border-slate-200 rounded p-3 text-center space-y-1.5 relative group hover:border-[#0B2545] transition"
              >
                <span className="text-[11px] font-black font-mono text-[#B91C1C]">
                  {step.num}
                </span>
                <h4 className="font-bold text-xs text-[#0B2545]">
                  {step.name}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Agriquene Section (Requirement 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-lg p-8 sm:p-10 border border-slate-800">
          <div className="max-w-3xl space-y-3 mb-8">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-xs">
              System Impact
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">
              Why Agriquene Transforms Mandi Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Transforming agricultural procurement from chaotic physical crowds into a predictable digital appointment service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyAgriquene.map((item) => (
              <div
                key={item.title}
                className="bg-slate-800/80 border border-slate-700 rounded p-4.5 space-y-2 hover:border-amber-400/60 transition"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <h3 className="font-bold text-sm text-white">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offline & Low Data / SMS Fallback Box (Requirement 30) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border-2 border-amber-300 rounded p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-200 rounded text-amber-900 flex-shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#0B2545]">
                Low Internet & Offline SMS Fallback Support
              </h3>
              <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
                Even when internet connectivity is limited in remote villages, Agriquene keeps farmers continuously informed with official automated SMS updates for token generation, queue movement, turn approaching, and DBT payments.
              </p>
            </div>
          </div>

          <Link
            href="/farmer/notifications"
            className="btn-gov-primary whitespace-nowrap text-xs py-2.5 px-4 font-bold"
          >
            Explore SMS Log
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  Smartphone, Building2, Ticket, Activity,
  Cpu, Scale, CreditCard, ArrowRight, CheckCircle2
} from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Mobile Number & OTP Authentication",
      desc: "Farmers enter their registered mobile number and verify with a secure 6-digit OTP. First-time farmers can link their PM-KISAN ID or landholding details in a 3-step wizard.",
      icon: Smartphone,
      highlight: "No passwords required"
    },
    {
      num: "02",
      title: "Mandi Discovery & Centre Comparison",
      desc: "Explore nearby agricultural procurement centres (APMCs/Mandis). Compare real-time queue lengths, active weighbridge counters, current waiting times, and available slot capacity.",
      icon: Building2,
      highlight: "Smart Workload Routing"
    },
    {
      num: "03",
      title: "Smart Slot Booking & Workload Recommendation",
      desc: "Select crop type, estimated quantity in quintals, and pick an optimal time window. The system flags workload-recommended slots to avoid peak mandi congestion.",
      icon: Ticket,
      highlight: "Guaranteed Entry Window"
    },
    {
      num: "04",
      title: "Token Generation & Real-Time Queue Tracking",
      desc: "An official digital token (e.g. #128) is generated instantly. Farmers can follow the live queue progression from home or tractor trolley without crowding the gate.",
      icon: Activity,
      highlight: "Live WebSocket Sync"
    },
    {
      num: "05",
      title: "AI-Powered ETA & 'When Should I Leave?'",
      desc: "Trained XGBoost models calculate precise waiting times taking into account crop moisture testing overhead, active counter pace, and road transit time buffers.",
      icon: Cpu,
      highlight: "Sub-5 Minute Accuracy"
    },
    {
      num: "06",
      title: "Transparent Weighing & Digital Receipt",
      desc: "Mandi procurement staff record certified gross and tare weights, enter moisture percentage, verify quality grade (FAQ Grade A/B), and calculate MSP payable with zero manual manipulation.",
      icon: Scale,
      highlight: "Zero Unauthorized Deductions"
    },
    {
      num: "07",
      title: "Direct Benefit Transfer (DBT) Payment",
      desc: "Government procurement funds are disbursed directly into the farmer's linked Aadhaar/PFMS bank account with complete UTR and transaction tracking.",
      icon: CreditCard,
      highlight: "Fast Direct Credit"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b-2 border-[#0B2545] pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">
          System Guide & Architecture
        </span>
        <h1 className="text-3xl font-extrabold text-[#0B2545] font-serif mt-1">
          How Agriquene Works
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
          A transparent, digital appointment and AI queue prediction workflow connecting farmers directly with government procurement mandis.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="bg-white border border-slate-200 rounded p-6 shadow-sm hover:border-[#0B2545] transition flex flex-col md:flex-row items-start md:items-center gap-6"
            >
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-3xl font-black font-mono text-[#0B2545] bg-slate-100 p-3 rounded">
                  {step.num}
                </span>
                <div className="p-3 bg-blue-50 text-[#0B2545] rounded-full">
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#0B2545]">
                    {step.title}
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                    {step.highlight}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Banner */}
      <div className="bg-[#0B2545] text-white p-8 rounded border-2 border-[#EA580C] text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif">
          Ready to experience hassle-free crop procurement?
        </h2>
        <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto">
          Login with your mobile number to view active tokens, book upcoming slots, and receive live SMS updates.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/farmer/login"
            className="btn-gov-red text-xs py-2.5 px-6 font-bold"
          >
            Farmer Login / Registration
          </Link>
          <Link
            href="/centres"
            className="btn-gov-outline text-xs py-2.5 px-6 font-bold"
          >
            Explore Mandis
          </Link>
        </div>
      </div>
    </div>
  );
}

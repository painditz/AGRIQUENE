"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Phone, Mail, MessageSquare } from "lucide-react";

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the AI predict my waiting time at the Mandi?",
      a: "Agriquene's machine learning model (trained using XGBoost) continuously evaluates the number of open weighbridge counters, your current queue position, historical gate service rates, and crop-specific moisture check times to calculate sub-5-minute accurate waiting forecasts."
    },
    {
      q: "What if I do not have a smartphone or active mobile internet?",
      a: "Agriquene features an automatic SMS gateway fallback. When you book a slot or when your token advances to the top 3 positions, an official SMS notification is dispatched directly to your mobile number with your expected turn time and gate arrival advisory."
    },
    {
      q: "How is the 'When Should I Leave?' departure time calculated?",
      a: "The departure advisor estimates your travel time to the mandi yard plus a 15-minute gate entry and weighing buffer, subtracting this from your expected turn time so you arrive right on time without standing in long queues."
    },
    {
      q: "When will the payment be credited to my bank account?",
      a: "Immediately upon completion of digital weighing and certified moisture inspection, an automated Direct Benefit Transfer (DBT) order is submitted to PFMS. Funds are normally credited into your linked Aadhaar bank account within 24 to 48 hours."
    },
    {
      q: "Can I reschedule or choose a different procurement slot?",
      a: "Yes. In the slot booking screen, you can select any available future slot. The system dynamically highlights recommended slots that have lower predicted waiting times."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b-2 border-[#0B2545] pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">
          FARMER HELPDESK & GUIDANCE
        </span>
        <h1 className="text-3xl font-extrabold text-[#0B2545] font-serif mt-1">
          Frequently Asked Questions (FAQ) & Help
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Find answers to common questions about slot booking, token queue tracking, AI waiting times, and DBT payments.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left p-4.5 font-bold text-sm text-[#0B2545] flex items-center justify-between gap-4 hover:bg-slate-50"
              >
                <span>{faq.q}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
              </button>
              {isOpen && (
                <div className="p-4.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Card */}
      <div className="bg-[#0B2545] text-white p-6 rounded border-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-bold font-serif">Still have questions or need assistance?</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Contact the 24x7 Kisan Call Centre or email our technical support desk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded text-center border border-white/20">
            <p className="text-[10px] uppercase font-bold text-amber-300">Toll-Free</p>
            <p className="font-bold text-sm">1800-180-1551</p>
          </div>
        </div>
      </div>
    </div>
  );
}

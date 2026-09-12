"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, SMSLogItem } from "@/lib/api";
import { Bell, MessageSquare, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";

export default function FarmerNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifs, sms] = await Promise.all([
        api.getNotifications(),
        api.getSMSLogs(),
      ]);
      setNotifications(notifs);
      setSmsLogs(sms);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              COMMUNICATION CENTRE
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Notifications & SMS Audit Log
            </h1>
            <p className="text-xs text-slate-500">
              Live broadcast messages and official SMS alerts dispatched to your phone (+91 9876543210).
            </p>
          </div>
          <button
            onClick={loadData}
            className="btn-gov-outline text-xs py-2 px-3 flex items-center gap-1 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* SMS Log Card */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#B91C1C]" />
              Official Government SMS Dispatches
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
              Carrier Status: ACTIVE
            </span>
          </div>

          <div className="space-y-3">
            {smsLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50 border border-slate-200 rounded p-4 space-y-2 hover:border-[#0B2545] transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0B2545] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {log.trigger_event}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-mono bg-white p-3 rounded border border-slate-200 leading-relaxed">
                  {log.message}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Recipient: +91 {log.mobile_number}</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SMS Delivered
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { staffApi, NotificationItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Bell, RefreshCw, CheckCircle2, Clock, ShieldCheck, AlertCircle } from "lucide-react";

export default function StaffNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const data = await staffApi.getNotifications(30);
      setNotifications(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
              OPERATIONAL ALERTS
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Desk Operational Notifications
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live broadcast alerts, gate arrival notices, and SMS delivery triggers for this mandi centre.
            </p>
          </div>

          <button
            onClick={loadNotifs}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Operational Notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No operational notifications recorded.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition">
                <div className="p-2 bg-blue-50 text-[#0B2545] rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StaffLayout>
  );
}

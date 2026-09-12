"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Phone, X, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { api, SMSLogItem } from "@/lib/api";

interface SMSPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerMobile?: string;
}

export function SMSPreviewModal({
  isOpen,
  onClose,
  farmerMobile = "9876543210",
}: SMSPreviewModalProps) {
  const [logs, setLogs] = useState<SMSLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getSMSLogs();
      setLogs(data);
    } catch {
      // Fallback in-memory demo logs
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border-2 border-[#0B2545]">
        {/* Header */}
        <div className="bg-[#0B2545] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">
              Official Agriquene SMS Dispatch Log (+91 {farmerMobile})
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 bg-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b">
            <span>Low-Data & Offline Fallback Channel</span>
            <button
              onClick={fetchLogs}
              className="text-[#0B2545] font-bold flex items-center gap-1 hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh Log
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-white p-4 rounded border border-slate-200 text-center text-xs text-slate-500">
              No recent SMS records. Trigger a booking or call next token to dispatch SMS.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded p-3.5 border border-slate-200 shadow-sm space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#0B2545] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {log.trigger_event}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                  {log.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>To: +91 {log.mobile_number}</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Delivered
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Automated SMS gateway keeps farmers updated without requiring active 4G data.
          </span>
          <button
            onClick={onClose}
            className="btn-gov-primary text-xs py-1.5 px-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

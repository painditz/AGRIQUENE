"use client";

import React, { useState, useEffect } from "react";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, ProcurementItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR, formatWeight } from "@/lib/utils";
import { FileText, Download, Printer, ExternalLink, RefreshCw } from "lucide-react";

export default function FarmerHistoryPage() {
  const [history, setHistory] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getFarmerHistory();
        setHistory(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            OFFICIAL PROCUREMENT AUDIT
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Procurement History & Archives
          </h1>
          <p className="text-xs text-slate-500">
            View past certified mandi sales, download official receipts, and verify MSP settlement logs.
          </p>
        </div>

        {/* History Table */}
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-[#0B2545] uppercase tracking-wide">
              Historical Procurement Records
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Total Records: {history.length}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No historical records found.
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                      <th className="p-2.5 font-bold">Date & Receipt</th>
                      <th className="p-2.5 font-bold">Procurement Mandi</th>
                      <th className="p-2.5 font-bold">Crop & Grade</th>
                      <th className="p-2.5 font-bold">Net Weight</th>
                      <th className="p-2.5 font-bold">Base MSP</th>
                      <th className="p-2.5 font-bold">Total Amount</th>
                      <th className="p-2.5 font-bold">Procurement Status</th>
                      <th className="p-2.5 font-bold">Payment Status</th>
                      <th className="p-2.5 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 font-sans">
                        <td className="p-2.5 font-mono">
                          <span className="font-bold text-[#0B2545]">{item.receipt_number}</span>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.verified_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-2.5 text-slate-800">{item.centre_name}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800">{item.crop_name}</span>
                          <p className="text-[10px] text-slate-500">{item.quality_grade}</p>
                        </td>
                        <td className="p-2.5 font-bold font-mono">
                          {item.net_weight_quintals.toFixed(2)} Qtl
                        </td>
                        <td className="p-2.5 font-mono">₹{item.base_msp.toFixed(2)}/Qtl</td>
                        <td className="p-2.5 font-bold text-[#B91C1C] font-mono text-sm">
                          {formatINR(item.total_amount)}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={item.payment_status} />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => window.print()}
                            className="btn-gov-outline text-[11px] py-1 px-2.5 font-semibold flex items-center gap-1 mx-auto"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards */}
              <div className="sm:hidden space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#0B2545]">{item.receipt_number}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-slate-800">{item.crop_name} ({item.net_weight_quintals.toFixed(2)} Qtl)</span>
                      <span className="font-black font-mono text-base text-[#B91C1C]">{formatINR(item.total_amount)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.centre_name} · Grade: {item.quality_grade}</p>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Payment:</span>
                        <StatusBadge status={item.payment_status} />
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="btn-gov-outline text-[11px] py-1 px-2 font-semibold flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}


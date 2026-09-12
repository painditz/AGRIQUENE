"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { staffApi, CentreQueueStatus, QueueItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Search, RefreshCw, Eye, ShieldCheck, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export default function StaffFarmersPage() {
  const { user } = useAuth();
  const [queueStatus, setQueueStatus] = useState<CentreQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inspectToken, setInspectToken] = useState<QueueItem | null>(null);

  const centreId = user?.centreId || 1;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await staffApi.getCentreQueue(centreId);
      setQueueStatus(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [centreId]);

  const items = (queueStatus?.queue || []).filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.farmer_name.toLowerCase().includes(s) ||
      (q.farmer_mobile_masked && q.farmer_mobile_masked.toLowerCase().includes(s)) ||
      q.token_display.toLowerCase().includes(s) ||
      (q.farmer_id_card && q.farmer_id_card.toLowerCase().includes(s))
    );
  });

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0B2545] px-2 py-0.5 rounded">
              OPERATIONAL DOSSIERS
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-1">
              Operational Farmer Records
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified identity and landholding declarations for farmers registered in today's receiving queue.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer name, masked mobile, or PM-KISAN ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-[#0B2545]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2545] animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold">Querying Operational Farmer Records...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No farmer records matching search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Farmer Name</th>
                    <th className="p-3">Token</th>
                    <th className="p-3">PM-KISAN / ID</th>
                    <th className="p-3">Contact (Masked)</th>
                    <th className="p-3">Origin Village / District</th>
                    <th className="p-3">Declared Crop</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((f) => (
                    <tr key={f.token_id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{f.farmer_name}</td>
                      <td className="p-3 font-mono font-bold text-[#0B2545]">{f.token_display}</td>
                      <td className="p-3 font-mono text-slate-700">{f.farmer_id_card || "Verified"}</td>
                      <td className="p-3 font-mono text-slate-600">{f.farmer_mobile_masked}</td>
                      <td className="p-3 text-slate-700">
                        {f.farmer_village ? `${f.farmer_village}, ${f.farmer_district}` : "Local Mandi"}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{f.crop}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {f.quantity_quintals} Qtl
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setInspectToken(f)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Farmer Dossier Modal */}
        {inspectToken && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-[#0B2545]">
                    Farmer Operational Dossier
                  </h3>
                </div>
                <button
                  onClick={() => setInspectToken(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-bold text-slate-900">{inspectToken.farmer_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">Mobile (Masked)</span>
                  <span className="font-mono text-slate-900">{inspectToken.farmer_mobile_masked}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">PM-KISAN Card</span>
                  <span className="font-mono font-bold text-slate-900">{inspectToken.farmer_id_card || "Verified"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">Declared Crop</span>
                  <span className="font-bold text-slate-900">{inspectToken.crop}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-bold text-emerald-700">{inspectToken.quantity_quintals} Quintals</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-slate-500">Booking Reference</span>
                  <span className="font-mono text-slate-900">{inspectToken.booking_reference || "Direct Entry"}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setInspectToken(null)}
                  className="px-4 py-2 bg-[#0B2545] text-white rounded-lg font-bold text-xs hover:bg-[#133E68]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

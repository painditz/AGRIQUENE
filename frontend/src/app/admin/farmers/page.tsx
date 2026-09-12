"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api } from "@/lib/api";
import { Users, Search, RefreshCw } from "lucide-react";

export default function AdminFarmersPage() {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadFarmers = async (query?: string) => {
    setLoading(true);
    try {
      const data = await api.getAdminFarmers(query);
      setFarmers(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmers();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              STATE BENEFICIARY MASTER
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Registered Farmers Registry
            </h1>
            <p className="text-xs text-slate-500">
              Verified farmers linked with PM-KISAN, Aadhaar, and landholding records.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by farmer name or mobile number (e.g. Ramesh, 9876543210)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                loadFarmers(e.target.value);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs outline-none focus:border-[#0B2545]"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Farmer ID</th>
                  <th className="p-2.5 font-bold">Full Name</th>
                  <th className="p-2.5 font-bold">Mobile</th>
                  <th className="p-2.5 font-bold">Location</th>
                  <th className="p-2.5 font-bold text-center">Landholding</th>
                  <th className="p-2.5 font-bold">Preferred Crop</th>
                  <th className="p-2.5 font-bold text-center">Tokens Issued</th>
                  <th className="p-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {farmers.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 font-sans">
                    <td className="p-2.5 font-mono font-bold text-[#0B2545]">{f.farmer_id_card || "N/A"}</td>
                    <td className="p-2.5 font-bold text-slate-800">{f.full_name}</td>
                    <td className="p-2.5 font-mono text-slate-600">{f.mobile_number}</td>
                    <td className="p-2.5 text-slate-600">{f.village}, {f.district}</td>
                    <td className="p-2.5 text-center font-mono">{f.land_acres} Acres</td>
                    <td className="p-2.5 font-semibold text-slate-700">{f.preferred_crop}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#B91C1C]">{f.total_tokens}</td>
                    <td className="p-2.5">
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        Verified KYC
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

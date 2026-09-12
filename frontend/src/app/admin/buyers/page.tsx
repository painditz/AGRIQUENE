"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api } from "@/lib/api";
import { UserCog, Plus, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function AdminBuyersPage() {
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const data = await api.getAdminBuyers();
        setBuyers(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
            STAFF ALLOCATION DIRECTORY
          </span>
          <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Mandi Procurement Officers & Weighbridge Staff
          </h1>
          <p className="text-xs text-slate-500">
            Assigned personnel operating weighbridge terminals and quality inspection desks.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Emp ID</th>
                  <th className="p-2.5 font-bold">Officer Name</th>
                  <th className="p-2.5 font-bold">Contact Mobile</th>
                  <th className="p-2.5 font-bold">Assigned Mandi</th>
                  <th className="p-2.5 font-bold text-center">Counter</th>
                  <th className="p-2.5 font-bold">Designation</th>
                  <th className="p-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {buyers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 font-sans">
                    <td className="p-2.5 font-mono font-bold text-[#0B2545]">{b.employee_id}</td>
                    <td className="p-2.5 font-bold text-slate-800">{b.full_name}</td>
                    <td className="p-2.5 font-mono text-slate-600">{b.mobile_number}</td>
                    <td className="p-2.5 text-slate-800 font-semibold">{b.centre_name}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#B91C1C]">Counter #{b.counter_number}</td>
                    <td className="p-2.5 text-slate-600">{b.designation}</td>
                    <td className="p-2.5">
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        Active Duty
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

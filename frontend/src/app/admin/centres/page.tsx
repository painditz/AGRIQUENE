"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building2, Plus, RefreshCw, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function AdminCentresPage() {
  const { user } = useAuth();
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Centre Form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Uttar Pradesh");
  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [capacity, setCapacity] = useState(150);
  const [counters, setCounters] = useState(4);

  const loadCentres = async () => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getCentres();
      setCentres(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCentre({
        name,
        code,
        address,
        district,
        state,
        pin_code: pinCode,
        capacity_per_day: capacity,
        active_counters: counters,
      });
      setShowAddModal(false);
      setName("");
      setCode("");
      setAddress("");
      setDistrict("");
      setPinCode("");
      await loadCentres();
    } catch (err) {
      console.error("Failed to create centre", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              INFRASTRUCTURE MASTER
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B2545] font-serif mt-0.5">
              Procurement Centres & APMC Yards
            </h1>
            <p className="text-xs text-slate-500">
              Manage Mandi capacity, active weighbridge counters, and operating hours.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gov-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Mandi Centre</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                  <th className="p-2.5 font-bold">Code</th>
                  <th className="p-2.5 font-bold">Mandi Name</th>
                  <th className="p-2.5 font-bold">District / State</th>
                  <th className="p-2.5 font-bold text-center">Counters</th>
                  <th className="p-2.5 font-bold text-center">Daily Capacity</th>
                  <th className="p-2.5 font-bold text-center">Operating Hours</th>
                  <th className="p-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {centres.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 font-sans">
                    <td className="p-2.5 font-mono font-bold text-[#0B2545]">{c.code}</td>
                    <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                    <td className="p-2.5 text-slate-600">{c.district}, {c.state}</td>
                    <td className="p-2.5 text-center font-mono">{c.active_counters} / {c.total_counters}</td>
                    <td className="p-2.5 text-center font-mono">{c.capacity_per_day} Trolleys/Day</td>
                    <td className="p-2.5 text-center font-mono text-[11px]">{c.open_time} – {c.close_time}</td>
                    <td className="p-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded border-2 border-[#0B2545] max-w-lg w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-[#0B2545] border-b pb-2">
                Register New Procurement Mandi
              </h3>
              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Mandi Centre Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Meerut Krishi Upaj Mandi"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Centre Code</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. APC-UP-MRT-06"
                      className="w-full p-2 border rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">District</label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Meerut"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">Full Mandi Yard Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Delhi Road Market Yard, Meerut"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Daily Capacity (Trolleys)</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 100)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Active Counters</label>
                    <input
                      type="number"
                      value={counters}
                      onChange={(e) => setCounters(parseInt(e.target.value) || 4)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-gov-outline py-1.5 px-4 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gov-primary py-1.5 px-4 font-bold"
                  >
                    Create Mandi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

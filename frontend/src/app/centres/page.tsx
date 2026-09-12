"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Phone, Users, Clock,
  CheckCircle2, ArrowRight, Layers, SlidersHorizontal,
  Navigation, Search
} from "lucide-react";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeafletMandiMap } from "@/components/map/LeafletMandiMap";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { calculateHaversineDistance } from "@/lib/utils";

export default function CentresPage() {
  const [farmerLocation, setFarmerLocation] = useState<SelectedLocation | null>(null);
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedCentresForCompare, setSelectedCentresForCompare] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "map" | "compare">("list");

  useEffect(() => {
    async function loadCentres() {
      try {
        const data = await api.getCentres();
        setCentres(data);
      } catch {
        // Fallback demo centres
      } finally {
        setLoading(false);
      }
    }
    loadCentres();
  }, []);

  const filteredCentres = centres.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === "All" || c.state === selectedState;
    return matchesSearch && matchesState;
  });

  const toggleCompare = (id: number) => {
    if (selectedCentresForCompare.includes(id)) {
      setSelectedCentresForCompare(selectedCentresForCompare.filter((cId) => cId !== id));
    } else {
      if (selectedCentresForCompare.length < 3) {
        setSelectedCentresForCompare([...selectedCentresForCompare, id]);
      }
    }
  };

  const comparedList = centres.filter((c) => selectedCentresForCompare.includes(c.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-[#0B2545] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">
            National Mandi Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-serif mt-0.5">
            Procurement Centres & Workload Radar
          </h1>
          <p className="text-xs text-slate-600">
            Compare real-time queue length, active weighbridge counters, and estimated waiting times across government mandis.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded text-xs font-bold">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "list" ? "bg-[#0B2545] text-white" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Directory Cards
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "compare" ? "bg-[#0B2545] text-white" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Compare ({selectedCentresForCompare.length})
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "map" ? "bg-[#0B2545] text-white" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Map Locator
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Mandi name, district, or code (e.g. Ghaziabad, Karnal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#0B2545] focus:border-[#0B2545] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-2 text-xs font-medium bg-white outline-none"
          >
            <option value="All">All States across India</option>
            <option value="Delhi">Delhi</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Haryana">Haryana</option>
            <option value="Punjab">Punjab</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Bihar">Bihar</option>
            <option value="West Bengal">West Bengal</option>
          </select>
        </div>
      </div>

      {/* View: Directory Cards */}
      {activeTab === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCentres.map((centre) => {
            const isComparing = selectedCentresForCompare.includes(centre.id);
            return (
              <div
                key={centre.id}
                className="gov-card flex flex-col justify-between hover:border-[#0B2545] transition shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {centre.code}
                      </span>
                      <h3 className="font-bold text-sm text-[#0B2545] mt-0.5">
                        {centre.name}
                      </h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#B91C1C]" />
                        <span>{centre.district}, {centre.state}</span>
                      </p>
                    </div>
                    <StatusBadge status={centre.status} />
                  </div>

                  {/* Operational Telemetry Grid */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">
                          Current Queue
                        </p>
                        <p className="text-base font-black text-[#0B2545] font-mono mt-0.5">
                          {centre.current_waiting_count}{" "}
                          <span className="text-[10px] font-normal text-slate-600">Waiting</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">
                          AI Est. Wait
                        </p>
                        <p className="text-base font-black text-[#B91C1C] font-mono mt-0.5">
                          {centre.estimated_wait_min}{" "}
                          <span className="text-[10px] font-normal text-slate-600">Min</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Active Counters:</span>
                        <strong className="text-slate-800 font-mono">
                          {centre.active_counters} / {centre.total_counters} Counters
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Slots Left Today:</span>
                        <strong className="text-emerald-700 font-mono">
                          {centre.available_slots_today} slots open
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Transit Distance:</span>
                        <strong className="text-slate-800 font-mono">
                          ~{centre.distance_km} km
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleCompare(centre.id)}
                    className={`text-xs px-2.5 py-1.5 rounded font-bold border transition ${
                      isComparing
                        ? "bg-[#0B2545] text-white border-[#0B2545]"
                        : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {isComparing ? "✓ Comparing" : "+ Compare"}
                  </button>

                  <Link
                    href={`/farmer/book?centre=${centre.id}`}
                    className="btn-gov-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                  >
                    <span>Select & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View: Comparison Table */}
      {activeTab === "compare" && (
        <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base text-[#0B2545]">
              Mandi Workload & Waiting-Time Comparison
            </h3>
            <span className="text-xs text-slate-500">
              Comparing {comparedList.length} selected centres
            </span>
          </div>

          {comparedList.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 space-y-2">
              <p>No centres selected for comparison yet.</p>
              <button
                onClick={() => {
                  setSelectedCentresForCompare(centres.slice(0, 3).map((c) => c.id));
                  setActiveTab("compare");
                }}
                className="text-[#0B2545] font-bold underline"
              >
                Compare Top 3 Nearby Mandis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[#0B2545]">
                    <th className="p-3">Attribute</th>
                    {comparedList.map((c) => (
                      <th key={c.id} className="p-3 font-bold border-l border-slate-200">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 font-semibold text-slate-600">Location</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 border-l border-slate-200">
                        {c.district}, {c.state}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="p-3 font-semibold text-amber-900">Current Queue</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 font-mono font-bold text-amber-950 border-l border-slate-200">
                        {c.current_waiting_count} farmers waiting
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="p-3 font-semibold text-blue-900">AI Estimated Wait</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 font-mono font-black text-[#B91C1C] border-l border-slate-200">
                        {c.estimated_wait_min} Minutes
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-600">Active Counters</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 font-mono border-l border-slate-200">
                        {c.active_counters} of {c.total_counters} Open
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-600">Available Slots Today</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 font-mono font-bold text-emerald-700 border-l border-slate-200">
                        {c.available_slots_today} slots
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-600">Action</td>
                    {comparedList.map((c) => (
                      <td key={c.id} className="p-3 border-l border-slate-200">
                        <Link
                          href={`/farmer/book?centre=${c.id}`}
                          className="btn-gov-primary text-xs py-1 px-2.5 inline-block"
                        >
                          Book Here
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View: Real Interactive Leaflet + OpenStreetMap Locator */}
      {activeTab === "map" && (
        <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div>
              <h3 className="font-bold text-base text-[#0B2545] flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#B91C1C]" /> National Mandi GIS Locator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by OpenStreetMap & Leaflet with live counter workload telemetry
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded border border-emerald-300 self-start sm:self-auto">
              OpenStreetMap · Free Map
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded space-y-2">
            <span className="text-xs font-bold text-[#0B2545] uppercase">
              Locate Your Farm or Village:
            </span>
            <AddressAutocomplete
              onLocationSelect={(loc) => setFarmerLocation(loc)}
              placeholder="Search address or tap Use My Current Location..."
            />
          </div>

          {(() => {
            const mappedCentres = centres.map((c) => ({
              ...c,
              calculated_distance_km: farmerLocation
                ? calculateHaversineDistance(farmerLocation.lat, farmerLocation.lng, c.latitude, c.longitude)
                : (c.distance_km ?? null),
            }));
            const sortedByDist = [...mappedCentres].sort(
              (a, b) => (a.calculated_distance_km ?? 9999) - (b.calculated_distance_km ?? 9999)
            );
            const nearestId = farmerLocation && sortedByDist.length > 0 ? sortedByDist[0].id : null;

            return (
              <LeafletMandiMap
                centres={sortedByDist}
                farmerLocation={farmerLocation}
                nearestCentreId={nearestId}
                height="460px"
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { MandiMapViewSwitcher } from "@/components/map/MandiMapViewSwitcher";
import { ChangeMandiModal } from "@/components/mandi/ChangeMandiModal";
import { calculateHaversineDistance } from "@/lib/utils";
import {
  Building2, MapPin, Users, Clock, ArrowRight, Navigation, RefreshCw,
  Search, SlidersHorizontal, CheckCircle2, Sparkles, Check, ChevronRight,
  AlertCircle
} from "lucide-react";

export default function FarmerCentresPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user, updateUser } = useAuth();

  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmerLocation, setFarmerLocation] = useState<SelectedLocation | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<CentreItem | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] = useState("ALL");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch centres from backend
  const fetchCentres = useCallback(async (loc?: SelectedLocation | null) => {
    setLoading(true);
    try {
      const lat = loc ? loc.lat : undefined;
      const lng = loc ? loc.lng : undefined;
      const data = await api.getCentres(undefined, undefined, lat, lng);
      setCentres(data);
    } catch {
      showToast("Unable to refresh procurement centres.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCentres(farmerLocation);
  }, [fetchCentres, farmerLocation]);

  // Hydrate initial farmer location and profile preferred centre
  useEffect(() => {
    async function initProfileAndLocation() {
      try {
        const prof = await api.getFarmerProfile().catch(() => null);
        if (prof) {
          if (prof.preferred_centre_id) {
            const centreDetail = await api.getCentreById(prof.preferred_centre_id).catch(() => null);
            if (centreDetail) {
              setSelectedCentre(centreDetail);
            }
          }

          if (prof.district && prof.state && !farmerLocation) {
            const locQuery = `${prof.village ? prof.village + ", " : ""}${prof.district}, ${prof.state}, India`;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locQuery)}&limit=1`,
                { headers: { "User-Agent": "Agriquene-Procurement-App/1.0" } }
              );
              if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                  setFarmerLocation({
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    name: `${prof.district}, ${prof.state}`,
                    displayName: `${prof.district}, ${prof.state}`,
                  });
                }
              }
            } catch {}
          }
        }
      } catch {}
    }
    initProfileAndLocation();
  }, []);

  // Listen for global mandi change event
  useEffect(() => {
    const handleMandiChanged = (e: any) => {
      if (e?.detail) {
        setSelectedCentre(e.detail);
      }
    };
    window.addEventListener("mandi-changed", handleMandiChanged);
    return () => window.removeEventListener("mandi-changed", handleMandiChanged);
  }, []);

  // When farmer selects a location
  const handleLocationSelect = (loc: SelectedLocation) => {
    setLocationError(null);
    setFarmerLocation(loc);
  };

  // Compute distances & sort centres
  const centresWithDistance = useMemo(() => {
    return centres.map((c) => {
      let distance = c.distance_km;
      if (farmerLocation) {
        distance = calculateHaversineDistance(
          farmerLocation.lat,
          farmerLocation.lng,
          c.latitude,
          c.longitude
        );
      }
      return {
        ...c,
        calculated_distance_km: distance,
      };
    });
  }, [centres, farmerLocation]);

  // Sorted by distance
  const sortedCentres = useMemo(() => {
    const list = [...centresWithDistance];
    list.sort((a, b) => (a.calculated_distance_km ?? 9999) - (b.calculated_distance_km ?? 9999));
    return list;
  }, [centresWithDistance]);

  // Identify Nearest Centre
  const nearestCentre = sortedCentres.length > 0 ? sortedCentres[0] : null;

  // Do not auto-select a default centre without user action

  // INTELLIGENT NEARBY CENTRES FOR MAP: Limit to top 6–8 nearby plus selected centre
  const nearbyCentresForMap = useMemo(() => {
    if (sortedCentres.length === 0) return [];
    const topNearby = [...sortedCentres.slice(0, 8)];
    if (selectedCentre && !topNearby.some((c) => c.id === selectedCentre.id)) {
      topNearby.push({
        ...selectedCentre,
        calculated_distance_km: selectedCentre.distance_km,
      });
    }
    return topNearby;
  }, [sortedCentres, selectedCentre]);

  // Handle setting a centre as chosen
  const handleSelectCentre = async (centre: CentreItem) => {
    try {
      await api.updatePreferredCentre(centre.id);
      setSelectedCentre(centre);
      updateUser({ centreId: centre.id, centreName: centre.name });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mandi-changed", { detail: centre }));
      }
      showToast(`Selected Mandi set to ${centre.name}`, "success");
    } catch {
      showToast("Unable to update preferred mandi.", "error");
    }
  };

  // Reset to Nearest Centre
  const handleUseNearest = async () => {
    if (nearestCentre) {
      await handleSelectCentre(nearestCentre);
    }
  };

  // Filtered list for the table below
  const displayList = useMemo(() => {
    let list = sortedCentres;
    if (selectedStateFilter !== "ALL") {
      list = list.filter((c) => c.state.toLowerCase() === selectedStateFilter.toLowerCase());
    }
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sortedCentres, selectedStateFilter, listSearch]);

  const uniqueStates = useMemo(() => {
    const s = new Set<string>();
    centres.forEach((c) => {
      if (c.state) s.add(c.state.trim());
    });
    return Array.from(s).sort();
  }, [centres]);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B91C1C]">
              PROCUREMENT CENTRES ACROSS INDIA
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              Find Your Nearest Mandi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Search your village or use your location to calculate real travel distances and live wait times.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangeModal(true)}
              className="bg-[#0B2545] hover:bg-[#133E68] text-amber-300 text-xs py-2 px-3.5 rounded font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Change Mandi</span>
            </button>
            <button
              onClick={() => fetchCentres(farmerLocation)}
              disabled={loading}
              className="btn-gov-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold min-h-[44px] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
              <span>{loading ? "Updating..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Address Autocomplete & GPS Location Box */}
        <div className="bg-white border-2 border-[#0B2545] rounded-md p-4 sm:p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#0B2545] uppercase tracking-wide">
              Your Location (आपका स्थान)
            </label>
            <p className="text-[11px] text-slate-500">
              Type your village, town, or tap &quot;Use My Current Location&quot; to calculate real driving distances.
            </p>
          </div>

          <AddressAutocomplete
            onLocationSelect={handleLocationSelect}
            placeholder="Type your village, town, district, or address..."
          />

          {locationError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{locationError}</span>
            </div>
          )}
        </div>

        {/* Interactive Dual-Engine Map (Clean: only nearby centres loaded) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#B91C1C]" />
              Nearby Procurement Map ({nearbyCentresForMap.length} Nearby Mandis)
            </h3>
            <span className="text-[11px] text-slate-500">
              Showing relevant mandis near your location. Tap any marker to view queue details.
            </span>
          </div>

          <MandiMapViewSwitcher
            centres={nearbyCentresForMap}
            farmerLocation={farmerLocation}
            nearestCentreId={nearestCentre?.id}
            selectedCentreId={selectedCentre?.id}
            onSelectCentre={(c) => handleSelectCentre(c)}
            height="420px"
          />
        </div>

        {/* TWO SEPARATE DISTINCTIONS: 1. NEAREST MANDI vs 2. SELECTED MANDI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Nearest Centre (Geographically Closest) */}
          {nearestCentre && (
            <div className="bg-white border-2 border-[#B91C1C] rounded-md p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-[#B91C1C] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide inline-block">
                      ★ NEAREST PROCUREMENT CENTRE
                    </span>
                    <h3 className="text-base font-bold text-[#0B2545] mt-1.5">{nearestCentre.name}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0" />
                      <span>{nearestCentre.address} · {nearestCentre.district}, {nearestCentre.state}</span>
                    </p>
                  </div>
                  <StatusBadge status={nearestCentre.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-red-50/60 p-3 rounded text-center text-xs border border-red-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance</span>
                    <p className="text-lg font-black text-[#0B2545] font-mono mt-0.5">
                      {nearestCentre.calculated_distance_km != null ? `${nearestCentre.calculated_distance_km.toFixed(1)} km` : "Select Location"}
                    </p>
                    <span className="text-[10px] text-slate-500">away</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Farmers in line</span>
                    <p className="text-lg font-black text-[#0F172A] font-mono mt-0.5">
                      {nearestCentre.current_waiting_count}
                    </p>
                    <span className="text-[10px] text-slate-500">waiting</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Wait</span>
                    <p className="text-lg font-black text-[#B91C1C] font-mono mt-0.5">
                      ~{nearestCentre.estimated_wait_min}m
                    </p>
                    <span className="text-[10px] text-slate-500">Wait time</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {selectedCentre?.id !== nearestCentre.id ? (
                  <button
                    onClick={() => handleSelectCentre(nearestCentre)}
                    className="bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs py-2 px-3 font-bold rounded flex-1 flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Set as Selected Mandi</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs py-2 px-3 font-bold rounded flex-1 flex items-center justify-center gap-1 min-h-[42px]">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Currently Selected</span>
                  </div>
                )}
                <Link
                  href={`/farmer/book?centre=${nearestCentre.id}`}
                  className="btn-gov-primary text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1 min-h-[42px] flex-1"
                >
                  <span>Book Slot Here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Card 2: Selected Centre (Farmer's Chosen Mandi) */}
          {selectedCentre ? (
            <div className="bg-white border-2 border-emerald-600 rounded-md p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-emerald-700 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      YOUR SELECTED PROCUREMENT CENTRE
                    </span>
                    <h3 className="text-base font-bold text-[#0B2545] mt-1.5">{selectedCentre.name}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{selectedCentre.address} · {selectedCentre.district}, {selectedCentre.state}</span>
                    </p>
                  </div>
                  <StatusBadge status={selectedCentre.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-emerald-50/60 p-3 rounded text-center text-xs border border-emerald-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance</span>
                    <p className="text-lg font-black text-[#0B2545] font-mono mt-0.5">
                      {selectedCentre.distance_km != null ? `${selectedCentre.distance_km.toFixed(1)} km` : "Calculated"}
                    </p>
                    <span className="text-[10px] text-slate-500">driving</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Farmers in line</span>
                    <p className="text-lg font-black text-[#0F172A] font-mono mt-0.5">
                      {selectedCentre.current_waiting_count}
                    </p>
                    <span className="text-[10px] text-slate-500">waiting</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Wait</span>
                    <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                      ~{selectedCentre.estimated_wait_min}m
                    </p>
                    <span className="text-[10px] text-slate-500">est. turn</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {selectedCentre.id !== nearestCentre?.id && (
                  <button
                    onClick={handleUseNearest}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs py-2 px-3 font-bold rounded flex-1 flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                    <span>Use Nearest Centre</span>
                  </button>
                )}
                <button
                  onClick={() => setShowChangeModal(true)}
                  className="btn-gov-outline text-xs py-2 px-3 font-bold flex items-center justify-center gap-1 min-h-[42px] flex-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Change Mandi</span>
                </button>
                <Link
                  href={`/farmer/book?centre=${selectedCentre.id}`}
                  className="btn-gov-primary text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1 min-h-[42px] flex-1"
                >
                  <span>Book Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-md p-6 text-center flex flex-col items-center justify-center space-y-3 min-h-[220px]">
              <span className="text-3xl">📍</span>
              <div>
                <h4 className="font-bold text-[#0B2545] text-base">Target Mandi Centre</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Select a procurement centre to continue and check real-time queue status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeModal(true)}
                className="btn-gov-primary text-xs py-2 px-4 font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Choose Mandi</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* ALL PROCUREMENT CENTRES DIRECTORY (WITH SEARCH & STATE FILTERS) */}
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0B2545]" />
                <span>All Procurement Centres Across India ({displayList.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Browse or search all 100+ government APMC procurement centres. Select any centre to set it as your target mandi.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search name, district, state..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              {uniqueStates.length > 1 && (
                <select
                  value={selectedStateFilter}
                  onChange={(e) => setSelectedStateFilter(e.target.value)}
                  className="border border-slate-300 rounded text-xs py-1.5 px-2 bg-slate-50"
                >
                  <option value="ALL">All States</option>
                  {uniqueStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayList.slice(0, 30).map((c) => {
              const isNearest = c.id === nearestCentre?.id;
              const isSelected = c.id === selectedCentre?.id;

              return (
                <div
                  key={c.id}
                  className={`border rounded-md p-3.5 transition flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                      : isNearest
                      ? "border-[#B91C1C] bg-red-50/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-xs text-[#0B2545] line-clamp-1">{c.name}</h4>
                      {isNearest && (
                        <span className="bg-[#B91C1C] text-white text-[8px] font-black uppercase px-1 py-0.2 rounded flex-shrink-0">
                          Nearest
                        </span>
                      )}
                      {isSelected && (
                        <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1 py-0.2 rounded flex-shrink-0">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 truncate">
                      {c.district}, {c.state} {c.calculated_distance_km != null ? `· ${c.calculated_distance_km.toFixed(1)} km` : ""}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                      <span>Line: <strong>{c.current_waiting_count}</strong></span>
                      <span>·</span>
                      <span>Wait: <strong>~{c.estimated_wait_min}m</strong></span>
                      <span>·</span>
                      <span>Desks: <strong>{c.active_counters}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      onClick={() => handleSelectCentre(c)}
                      disabled={isSelected}
                      className={`text-[11px] py-1 px-2.5 rounded font-bold transition flex-1 flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-700 text-white cursor-default"
                          : "bg-slate-100 hover:bg-[#0B2545] text-slate-700 hover:text-white"
                      }`}
                    >
                      {isSelected ? "Current Mandi" : "Select Mandi"}
                    </button>
                    <Link
                      href={`/farmer/book?centre=${c.id}`}
                      className="bg-[#0B2545] hover:bg-[#133E68] text-white text-[11px] py-1 px-2.5 rounded font-bold flex items-center gap-1"
                    >
                      <span>Book</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {displayList.length > 30 && (
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">
                Displaying 30 of {displayList.length} mandis. Use the search box or &quot;Change Mandi&quot; modal to search any mandi in India.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Change Mandi Modal */}
      <ChangeMandiModal
        isOpen={showChangeModal}
        onClose={() => setShowChangeModal(false)}
        farmerLocation={farmerLocation}
        currentSelectedId={selectedCentre?.id}
        nearestCentre={nearestCentre}
        onSelectCentre={(centre) => {
          setSelectedCentre(centre);
        }}
        onUseNearest={handleUseNearest}
      />
    </FarmerLayout>
  );
}

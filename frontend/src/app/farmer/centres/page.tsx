"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { FarmerLayout } from "@/components/layout/FarmerLayout";
import { api, CentreItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { AddressAutocomplete, SelectedLocation } from "@/components/map/AddressAutocomplete";
import { LeafletMandiMap } from "@/components/map/LeafletMandiMap";
import { calculateHaversineDistance } from "@/lib/utils";
import {
  Building2, MapPin, Users, Clock, ArrowRight, Navigation, RefreshCw,
  Search, SlidersHorizontal, CheckCircle2, Sparkles, ExternalLink, Star
} from "lucide-react";

export default function FarmerCentresPage() {
  const { t } = useLanguage();
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmerLocation, setFarmerLocation] = useState<SelectedLocation | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<CentreItem | null>(null);

  // Fetch centres from backend
  const fetchCentres = useCallback(async (loc?: SelectedLocation | null) => {
    setLoading(true);
    try {
      const lat = loc ? loc.lat : undefined;
      const lng = loc ? loc.lng : undefined;
      const data = await api.getCentres(undefined, undefined, lat, lng);
      setCentres(data);
    } catch {
      // Fallback handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres(farmerLocation);
  }, [fetchCentres, farmerLocation]);

  // When farmer selects a location or detects current location
  const handleLocationSelect = (loc: SelectedLocation) => {
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

  // Identify Recommended Centre (combining distance score + wait time)
  const recommendedCentre = useMemo(() => {
    if (sortedCentres.length === 0) return null;
    // Score based on 60% distance + 40% waiting time
    const scored = [...sortedCentres].map((c) => {
      const distScore = (c.calculated_distance_km ?? 10) * 2; // ~2 mins per km travel
      const waitScore = c.estimated_wait_min;
      const totalScore = distScore + waitScore;
      return { ...c, totalScore };
    });
    scored.sort((a, b) => a.totalScore - b.totalScore);
    return scored[0];
  }, [sortedCentres]);

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
              NEARBY PROCUREMENT MANDIS
            </span>
            <h1 className="text-2xl font-black text-[#0B2545] font-serif mt-0.5">
              Find Your Nearest Mandi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Search your village or use your location to find the closest procurement centres with shortest lines.
            </p>
          </div>
          <button
            onClick={() => fetchCentres(farmerLocation)}
            disabled={loading}
            className="btn-gov-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold self-start sm:self-auto min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0B2545]" : ""}`} />
            <span>{loading ? "Updating..." : "Refresh Mandis"}</span>
          </button>
        </div>

        {/* Address Autocomplete & GPS Location Box */}
        <div className="bg-white border-2 border-[#0B2545] rounded-md p-4 sm:p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#0B2545] uppercase tracking-wide">
              Where are you located? (स्थान खोजें)
            </label>
            <p className="text-[11px] text-slate-500">
              Type your village, town, or tap &quot;Use My Current Location&quot; to calculate real driving distances.
            </p>
          </div>

          <AddressAutocomplete
            onLocationSelect={handleLocationSelect}
            placeholder="Type your village, town or address..."
          />
        </div>

        {/* Interactive Free Leaflet + OpenStreetMap */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#B91C1C]" />
              Interactive Procurement Map
            </h3>
            <span className="text-[11px] text-slate-500">
              Tap any mandi marker to view wait times and directions
            </span>
          </div>

          <LeafletMandiMap
            centres={sortedCentres}
            farmerLocation={farmerLocation}
            nearestCentreId={nearestCentre?.id}
            selectedCentreId={selectedCentre?.id}
            onSelectCentre={(c) => setSelectedCentre(c)}
            height="400px"
          />
        </div>

        {/* NEAREST CENTRE & RECOMMENDED CENTRE HIGHLIGHT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Nearest Centre Card */}
          {nearestCentre && (
            <div className="bg-white border-2 border-[#B91C1C] rounded-md p-5 shadow-sm space-y-3 relative overflow-hidden">
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
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Waiting Line</span>
                  <p className="text-lg font-black text-[#0F172A] font-mono mt-0.5">
                    {nearestCentre.current_waiting_count}
                  </p>
                  <span className="text-[10px] text-slate-500">Farmers in queue</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Wait</span>
                  <p className="text-lg font-black text-[#B91C1C] font-mono mt-0.5">
                    ~{nearestCentre.estimated_wait_min}m
                  </p>
                  <span className="text-[10px] text-slate-500">Wait time</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={
                    farmerLocation
                      ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${nearestCentre.latitude},${nearestCentre.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${nearestCentre.latitude},${nearestCentre.longitude}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gov-outline text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 flex-1 min-h-[44px]"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>Get Directions</span>
                </a>
                <Link
                  href={`/farmer/book?centre=${nearestCentre.id}`}
                  className="btn-gov-primary text-xs py-2 px-4 font-bold flex items-center justify-center gap-1.5 flex-1 min-h-[44px]"
                >
                  <span>Book Slot Here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 2. Smart Recommended Centre Card */}
          {recommendedCentre && (
            <div className="bg-white border-2 border-[#0B2545] rounded-md p-5 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="bg-[#0B2545] text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    RECOMMENDED FOR YOU
                  </span>
                  <h3 className="text-base font-bold text-[#0B2545] mt-1.5">{recommendedCentre.name}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{recommendedCentre.address}</span>
                  </p>
                </div>
                <StatusBadge status={recommendedCentre.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 bg-blue-50/60 p-3 rounded text-center text-xs border border-blue-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance</span>
                  <p className="text-lg font-black text-[#0B2545] font-mono mt-0.5">
                    {recommendedCentre.calculated_distance_km != null ? `${recommendedCentre.calculated_distance_km.toFixed(1)} km` : "Select Location"}
                  </p>
                  <span className="text-[10px] text-slate-500">away</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Counters</span>
                  <p className="text-lg font-black text-[#0F172A] font-mono mt-0.5">
                    {recommendedCentre.active_counters} Open
                  </p>
                  <span className="text-[10px] text-slate-500">Fast unloading</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Wait</span>
                  <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    ~{recommendedCentre.estimated_wait_min}m
                  </p>
                  <span className="text-[10px] text-slate-500">Short queue</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={
                    farmerLocation
                      ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${recommendedCentre.latitude},${recommendedCentre.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${recommendedCentre.latitude},${recommendedCentre.longitude}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gov-outline text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 flex-1 min-h-[44px]"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>
                <Link
                  href={`/farmer/book?centre=${recommendedCentre.id}`}
                  className="btn-gov-primary text-xs py-2 px-4 font-bold flex items-center justify-center gap-1.5 flex-1 min-h-[44px]"
                >
                  <span>Book Slot Here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ALL PROCUREMENT CENTRES LIST (SORTED BY DISTANCE) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#0B2545]" />
              All Procurement Centres ({sortedCentres.length}) — Sorted by Distance
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedCentres.map((c, index) => {
              const isNearest = c.id === nearestCentre?.id;
              const isRecommended = c.id === recommendedCentre?.id;

              return (
                <div
                  key={c.id}
                  className={`bg-white border-2 rounded-md p-4 sm:p-5 shadow-sm transition flex flex-col justify-between ${
                    isNearest
                      ? "border-[#B91C1C]"
                      : isRecommended
                      ? "border-[#0B2545]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-400">#{index + 1}</span>
                          <h3 className="font-bold text-base text-[#0B2545]">{c.name}</h3>
                          {isNearest && (
                            <span className="bg-[#B91C1C] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Nearest
                            </span>
                          )}
                          {isRecommended && !isNearest && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0" />
                          <span>{c.district}, {c.state} {c.calculated_distance_km != null ? `(~${c.calculated_distance_km.toFixed(1)} km away)` : ""}</span>
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded text-xs border border-slate-200 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Queue</span>
                        <p className="text-base font-black text-[#0B2545] font-mono mt-0.5">{c.current_waiting_count}</p>
                        <span className="text-[10px] text-slate-500">waiting</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Wait Time</span>
                        <p className="text-base font-black text-[#B91C1C] font-mono mt-0.5">~{c.estimated_wait_min}m</p>
                        <span className="text-[10px] text-slate-500">estimate</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Counters</span>
                        <p className="text-base font-black text-emerald-700 font-mono mt-0.5">{c.active_counters}</p>
                        <span className="text-[10px] text-slate-500">open</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                    <a
                      href={
                        farmerLocation
                          ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${c.latitude},${c.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gov-outline text-xs py-2 px-3 font-semibold flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#B91C1C]" />
                      <span>Navigate</span>
                    </a>
                    <Link
                      href={`/farmer/book?centre=${c.id}`}
                      className="btn-gov-primary text-xs py-2 px-4 font-bold flex-1 text-center min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                      <span>Book Slot Here</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api, CentreItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  Search, X, MapPin, Users, Clock, Check,
  Sparkles, SlidersHorizontal, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";

interface ChangeMandiModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerLocation?: { lat: number; lng: number; name?: string } | null;
  currentSelectedId?: number | null;
  nearestCentre?: CentreItem | null;
  onSelectCentre: (centre: CentreItem) => void;
  onUseNearest?: () => void;
}

export function ChangeMandiModal({
  isOpen,
  onClose,
  farmerLocation,
  currentSelectedId,
  nearestCentre,
  onSelectCentre,
  onUseNearest,
}: ChangeMandiModalProps) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCentres = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const lat = farmerLocation?.lat;
      const lng = farmerLocation?.lng;
      const data = await api.getCentres(
        undefined,
        undefined,
        lat,
        lng,
        search ? search.trim() : undefined
      );
      setCentres(data);
    } catch {
      showToast("Unable to load procurement centres. Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  }, [farmerLocation, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchCentres(searchQuery);
    }
  }, [isOpen, fetchCentres, searchQuery]);

  // Extract unique states for filtering
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    centres.forEach((c) => {
      if (c.state) states.add(c.state.trim());
    });
    return Array.from(states).sort();
  }, [centres]);

  // Filtered by state
  const filteredCentres = useMemo(() => {
    let list = centres;
    if (selectedState !== "ALL") {
      list = list.filter((c) => c.state.toLowerCase() === selectedState.toLowerCase());
    }
    return list;
  }, [centres, selectedState]);

  const handleSelect = async (centre: CentreItem) => {
    setUpdatingId(centre.id);
    try {
      await api.updatePreferredCentre(centre.id);
      updateUser({ centreId: centre.id, centreName: centre.name });

      // Dispatch event across tabs and components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mandi-changed", { detail: centre }));
      }

      onSelectCentre(centre);
      showToast(`Selected Mandi updated to ${centre.name}`, "success");
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to update selected mandi.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUseNearest = async () => {
    if (!nearestCentre) return;
    if (onUseNearest) {
      onUseNearest();
    }
    await handleSelect(nearestCentre);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              Procurement Centre Selection
            </span>
            <h2 className="text-xl font-bold font-serif mt-0.5">
              Change Procurement Centre
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Select your preferred mandi for slot booking, gate arrival, and live queue updates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Reset to Nearest Banner */}
        {nearestCentre && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 sm:px-5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-[#B91C1C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                ★ Nearest
              </span>
              <span className="font-semibold text-slate-800 line-clamp-1">
                {nearestCentre.name} ({nearestCentre.distance_km != null ? `${nearestCentre.distance_km.toFixed(1)} km away` : "Closest"})
              </span>
            </div>
            <button
              onClick={handleUseNearest}
              disabled={updatingId === nearestCentre.id}
              className="bg-[#0B2545] hover:bg-[#133E68] text-amber-300 font-bold px-3 py-1.5 rounded text-xs transition flex-shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Use Nearest Centre</span>
            </button>
          </div>
        )}

        {/* Search & State Filter Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by mandi name, district, or city..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B2545]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {availableStates.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Filter State:
              </span>
              <button
                onClick={() => setSelectedState("ALL")}
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                  selectedState === "ALL"
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                All States ({centres.length})
              </button>
              {availableStates.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    selectedState === st
                      ? "bg-[#0B2545] text-white shadow-xs"
                      : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mandi Selection List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0B2545] mb-2" />
              <span>Loading nearby procurement centres...</span>
            </div>
          ) : filteredCentres.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-sm">No procurement centres found</p>
              <p>Try searching for a different district or clear your search term.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedState("ALL");
                }}
                className="btn-gov-outline text-xs px-3 py-1 font-bold mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredCentres.map((centre) => {
              const isSelected = centre.id === currentSelectedId;
              const isNearest = centre.id === nearestCentre?.id;
              const isUpdating = updatingId === centre.id;

              return (
                <div
                  key={centre.id}
                  className={`border rounded-lg p-3 sm:p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600"
                      : isNearest
                      ? "border-[#B91C1C] bg-red-50/20 hover:bg-red-50/40"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#0B2545]">{centre.name}</h4>
                      {isNearest && (
                        <span className="bg-[#B91C1C] text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                          ★ Nearest
                        </span>
                      )}
                      {isSelected && (
                        <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                        {centre.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{centre.address} · {centre.district}, {centre.state}</span>
                    </p>

                    {/* Operational Telemetry */}
                    <div className="flex items-center gap-4 text-xs pt-1 flex-wrap text-slate-600 font-medium">
                      {centre.distance_km != null && (
                        <div className="flex items-center gap-1 font-bold text-[#0B2545]">
                          <span>🚗</span>
                          <span>{centre.distance_km.toFixed(1)} km away</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Line: <strong>{centre.current_waiting_count}</strong> farmers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Wait: <strong>~{centre.estimated_wait_min}m</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🚪</span>
                        <span>Counters: <strong>{centre.active_counters} Open</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => handleSelect(centre)}
                      disabled={isUpdating || isSelected}
                      className={`w-full sm:w-auto px-4 py-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer ${
                        isSelected
                          ? "bg-emerald-700 text-white cursor-default"
                          : "bg-[#0B2545] hover:bg-[#133E68] text-white active:scale-98"
                      }`}
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Current Mandi</span>
                        </>
                      ) : (
                        <>
                          <span>Select Mandi</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Displaying {filteredCentres.length} procurement centres
          </span>
          <button
            onClick={onClose}
            className="btn-gov-outline text-xs px-4 py-1.5 font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

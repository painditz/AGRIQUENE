"use client";

import React, { useState } from "react";
import { CentreItem } from "@/lib/api";
import { LeafletMandiMap, FarmerLocation } from "./LeafletMandiMap";
import { MapLibreMandiMap } from "./MapLibreMandiMap";
import { Map, Layers } from "lucide-react";

interface MandiMapViewSwitcherProps {
  centres: (CentreItem & { calculated_distance_km?: number | null })[];
  farmerLocation?: FarmerLocation | null;
  selectedCentreId?: number | null;
  nearestCentreId?: number | null;
  onSelectCentre?: (centre: CentreItem) => void;
  className?: string;
  height?: string;
}

export function MandiMapViewSwitcher({
  centres,
  farmerLocation,
  selectedCentreId,
  nearestCentreId,
  onSelectCentre,
  className = "",
  height = "440px",
}: MandiMapViewSwitcherProps) {
  const [mapProvider, setMapProvider] = useState<"leaflet" | "maplibre">("leaflet");

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Map Mode Switcher Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span className="text-[#0B2545] font-bold">Map Engine:</span>
          <span>{mapProvider === "leaflet" ? "OpenStreetMap Standard (Leaflet)" : "Vector Tile View (MapLibre GL)"}</span>
        </div>

        {/* Toggle Switch */}
        <div className="inline-flex rounded-md p-0.5 bg-slate-200 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => setMapProvider("leaflet")}
            className={`flex items-center gap-1.5 py-1 px-3 rounded text-[11px] transition cursor-pointer ${
              mapProvider === "leaflet"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-[#0B2545]"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Standard Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMapProvider("maplibre")}
            className={`flex items-center gap-1.5 py-1 px-3 rounded text-[11px] transition cursor-pointer ${
              mapProvider === "maplibre"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-[#0B2545]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Alternative Map</span>
          </button>
        </div>
      </div>

      {/* Synchronized Map Views */}
      {mapProvider === "leaflet" ? (
        <LeafletMandiMap
          centres={centres}
          farmerLocation={farmerLocation}
          selectedCentreId={selectedCentreId}
          nearestCentreId={nearestCentreId}
          onSelectCentre={onSelectCentre}
          height={height}
        />
      ) : (
        <MapLibreMandiMap
          centres={centres}
          farmerLocation={farmerLocation}
          selectedCentreId={selectedCentreId}
          nearestCentreId={nearestCentreId}
          onSelectCentre={onSelectCentre}
          height={height}
        />
      )}
    </div>
  );
}

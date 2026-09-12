"use client";

import React, { useEffect, useRef } from "react";
import { CentreItem } from "@/lib/api";

export interface FarmerLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface LeafletMandiMapProps {
  centres: (CentreItem & { calculated_distance_km?: number | null })[];
  farmerLocation?: FarmerLocation | null;
  selectedCentreId?: number | null;
  nearestCentreId?: number | null;
  onSelectCentre?: (centre: CentreItem) => void;
  className?: string;
  height?: string;
}

export function LeafletMandiMap({
  centres,
  farmerLocation,
  selectedCentreId,
  nearestCentreId,
  onSelectCentre,
  className = "",
  height = "420px",
}: LeafletMandiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      const defaultCenter: [number, number] = farmerLocation
        ? [farmerLocation.lat, farmerLocation.lng]
        : centres.length > 0
        ? [centres[0].latitude, centres[0].longitude]
        : [28.6692, 77.4538];

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: farmerLocation ? 11 : 9,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      renderMarkers(L, map);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      renderMarkers(L, mapInstanceRef.current);
    });
  }, [centres, farmerLocation, selectedCentreId, nearestCentreId]);

  const renderMarkers = (L: any, map: any) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const boundsLatLngs: [number, number][] = [];

    // 1. Farmer Marker
    if (farmerLocation && farmerLocation.lat && farmerLocation.lng) {
      const farmerIcon = L.divIcon({
        className: "custom-farmer-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #0B2545; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
              <span>📍</span>
              <span>You are here</span>
            </div>
            <div style="width: 14px; height: 14px; background: #0B2545; border: 3px solid #60A5FA; border-radius: 50%; box-shadow: 0 0 10px #3B82F6; margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });

      const farmerMarker = L.marker([farmerLocation.lat, farmerLocation.lng], { icon: farmerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; padding: 4px; font-size: 12px;">
            <strong style="color: #0B2545; font-size: 13px;">📍 Your Location</strong>
            <p style="margin: 4px 0 0 0; color: #475569;">${farmerLocation.name || "Selected Location"}</p>
          </div>
        `);

      markersRef.current.push(farmerMarker);
      boundsLatLngs.push([farmerLocation.lat, farmerLocation.lng]);
    }

    // 2. Mandi Markers
    centres.forEach((centre) => {
      const isNearest = centre.id === nearestCentreId;
      const isSelected = centre.id === selectedCentreId;
      const distance = centre.calculated_distance_km !== undefined ? centre.calculated_distance_km : centre.distance_km;

      const pinBg = isNearest ? "#B91C1C" : isSelected ? "#0B2545" : "#133E68";
      const pinBorder = isNearest ? "#FEF08A" : "#FFFFFF";

      const mandiIcon = L.divIcon({
        className: "custom-mandi-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            ${
              isNearest
                ? `<div style="background: #FEF08A; color: #854D0E; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 1px solid #FACC15;">★ Nearest</div>`
                : ""
            }
            <div style="background: ${pinBg}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.25); border: 2.5px solid ${pinBorder};">
              <span style="transform: rotate(45deg); font-size: 16px;">🌾</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.85); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 2px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
              ${centre.name.split("–")[0].replace("Agri Procurement Centre", "Mandi").trim()}
            </div>
          </div>
        `,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
      });

      const navUrl = farmerLocation
        ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${centre.latitude},${centre.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${centre.latitude},${centre.longitude}`;

      const popupContent = `
        <div style="font-family: inherit; padding: 2px; min-width: 220px; font-size: 12px; color: #0F172A;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${isNearest ? "#B91C1C" : "#0B2545"};">
              ${isNearest ? "★ NEAREST PROCUREMENT CENTRE" : "PROCUREMENT CENTRE"}
            </span>
            <span style="font-size: 9px; font-weight: bold; background: ${centre.status === "OPEN" ? "#DCFCE7" : "#FEF3C7"}; color: ${centre.status === "OPEN" ? "#166534" : "#92400E"}; padding: 1px 5px; border-radius: 4px;">
              ${centre.status}
            </span>
          </div>

          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0B2545; line-height: 1.3;">${centre.name}</h4>
          <p style="margin: 2px 0 6px 0; font-size: 11px; color: #64748B;">${centre.address}</p>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Distance</span>
              <strong style="color: #0B2545; font-size: 12px;">${distance != null ? `${distance.toFixed(1)} km away` : "Select location"}</strong>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Estimated Wait</span>
              <strong style="color: #B91C1C; font-size: 12px;">~${centre.estimated_wait_min} min</strong>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Waiting Farmers</span>
              <strong style="color: #0F172A;">${centre.current_waiting_count} in line</strong>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Active Counters</span>
              <strong style="color: #0F172A;">${centre.active_counters} open</strong>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0B2545; color: white; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
              <span>🧭 Get Directions</span>
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([centre.latitude, centre.longitude], { icon: mandiIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on("click", () => {
        if (onSelectCentre) {
          onSelectCentre(centre);
        }
      });

      markersRef.current.push(marker);
      boundsLatLngs.push([centre.latitude, centre.longitude]);
    });

    if (boundsLatLngs.length > 1) {
      map.fitBounds(boundsLatLngs, {
        padding: [40, 40],
        maxZoom: 13,
      });
    } else if (boundsLatLngs.length === 1) {
      map.setView(boundsLatLngs[0], 11);
    }
  };

  return (
    <div className={`relative rounded-md border-2 border-[#0B2545] overflow-hidden shadow-sm ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: "100%", zIndex: 1 }} />

      <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm border border-slate-300 rounded px-2.5 py-1.5 shadow text-[10px] font-semibold flex flex-col gap-1 z-[400]">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0B2545] border border-blue-400 inline-block" />
          <span>📍 Your Location</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#133E68] inline-block" />
          <span>🌾 Procurement Centre</span>
        </div>
        {nearestCentreId && (
          <div className="flex items-center gap-1.5 text-[#B91C1C] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] inline-block" />
            <span>★ Nearest Centre</span>
          </div>
        )}
      </div>
    </div>
  );
}

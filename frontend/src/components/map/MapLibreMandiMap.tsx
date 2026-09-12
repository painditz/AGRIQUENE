"use client";

import React, { useEffect, useRef, useState } from "react";
import { CentreItem } from "@/lib/api";
import { FarmerLocation } from "./LeafletMandiMap";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapLibreMandiMapProps {
  centres: (CentreItem & { calculated_distance_km?: number | null })[];
  farmerLocation?: FarmerLocation | null;
  selectedCentreId?: number | null;
  nearestCentreId?: number | null;
  onSelectCentre?: (centre: CentreItem) => void;
  className?: string;
  height?: string;
}

export function MapLibreMandiMap({
  centres,
  farmerLocation,
  selectedCentreId,
  nearestCentreId,
  onSelectCentre,
  className = "",
  height = "440px",
}: MapLibreMandiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [routeInfo, setRouteInfo] = useState<{
    targetName: string;
    distanceKm: number;
    durationMin: number;
    navUrl: string;
  } | null>(null);

  // Setup global callback for marker popups
  useEffect(() => {
    (window as any).selectMandiFromMapLibre = (id: number) => {
      const c = centres.find((x) => x.id === id);
      if (c && onSelectCentre) {
        onSelectCentre(c);
      }
    };
    return () => {
      delete (window as any).selectMandiFromMapLibre;
    };
  }, [centres, onSelectCentre]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const maplibregl = (await import("maplibre-gl")) as any;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted || !mapContainerRef.current) return;

      const defaultCenter: [number, number] = farmerLocation
        ? [farmerLocation.lng, farmerLocation.lat]
        : centres.length > 0
        ? [centres[0].longitude, centres[0].latitude]
        : [77.2090, 28.6139];

      // Use free OpenStreetMap / Carto raster style or OpenFreeMap vector style
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: [
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm-layer",
              type: "raster",
              source: "osm-tiles",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: defaultCenter,
        zoom: farmerLocation ? 10 : 8,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      mapInstanceRef.current = map;

      map.on("load", () => {
        if (!isMounted) return;
        renderMapLibreMarkers(maplibregl, map);
      });
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
    import("maplibre-gl").then((module: any) => {
      const maplibregl = module;
      if (mapInstanceRef.current && mapInstanceRef.current.isStyleLoaded()) {
        renderMapLibreMarkers(maplibregl, mapInstanceRef.current);
      }
    });
  }, [centres, farmerLocation, selectedCentreId, nearestCentreId]);

  const renderMapLibreMarkers = async (maplibregl: any, map: any) => {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Remove route source/layer if exists
    if (map.getSource("route-source")) {
      if (map.getLayer("route-layer-outline")) map.removeLayer("route-layer-outline");
      if (map.getLayer("route-layer")) map.removeLayer("route-layer");
      map.removeSource("route-source");
    }

    const bounds = new maplibregl.LngLatBounds();

    // 1. Farmer Marker
    if (farmerLocation && farmerLocation.lat && farmerLocation.lng) {
      const farmerEl = document.createElement("div");
      farmerEl.className = "maplibre-farmer-marker";
      farmerEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(0, -50%);">
          <div style="background: #0B2545; color: #FDE047; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.25); white-space: nowrap;">
            📍 Your Location
          </div>
          <div style="width: 14px; height: 14px; background: #0B2545; border: 3px solid #60A5FA; border-radius: 50%; box-shadow: 0 0 10px #3B82F6; margin-top: 2px;"></div>
        </div>
      `;

      const farmerPopup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="font-family: inherit; padding: 4px; font-size: 12px;">
          <strong style="color: #0B2545; font-size: 13px;">📍 Your Location</strong>
          <p style="margin: 4px 0 0 0; color: #475569;">${farmerLocation.name || "Selected Farm Location"}</p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: farmerEl })
        .setLngLat([farmerLocation.lng, farmerLocation.lat])
        .setPopup(farmerPopup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([farmerLocation.lng, farmerLocation.lat]);
    }

    // Identify target centre
    const targetCentre =
      centres.find((c) => c.id === selectedCentreId) ||
      centres.find((c) => c.id === nearestCentreId) ||
      (centres.length > 0 ? centres[0] : null);

    // 2. Mandi Markers
    centres.forEach((centre) => {
      const isNearest = centre.id === nearestCentreId;
      const isSelected = centre.id === selectedCentreId;
      const distance = centre.calculated_distance_km !== undefined ? centre.calculated_distance_km : centre.distance_km;

      const pinBg = isNearest ? "#B91C1C" : isSelected ? "#059669" : "#0B2545";
      const pinBorder = isNearest ? "#FEF08A" : isSelected ? "#A7F3D0" : "#FFFFFF";

      const el = document.createElement("div");
      el.className = "maplibre-mandi-marker";
      el.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(0, -50%);">
          ${
            isNearest
              ? `<div style="background: #FEF08A; color: #854D0E; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 1px solid #FACC15;">★ Nearest</div>`
              : isSelected
              ? `<div style="background: #D1FAE5; color: #065F46; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 1px solid #A7F3D0;">✓ Selected</div>`
              : ""
          }
          <div style="background: ${pinBg}; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.25); border: 2px solid ${pinBorder};">
            <span style="transform: rotate(45deg); font-size: 15px;">🌾</span>
          </div>
        </div>
      `;

      const navUrl = farmerLocation
        ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${centre.latitude},${centre.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${centre.latitude},${centre.longitude}`;

      const popupHtml = `
        <div style="font-family: inherit; padding: 2px; min-width: 230px; font-size: 12px; color: #0F172A;">
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
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Farmers in line</span>
              <strong style="color: #0F172A;">${centre.current_waiting_count} waiting</strong>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Open Desks</span>
              <strong style="color: #0F172A;">${centre.active_counters} counters</strong>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <button onclick="window.selectMandiFromMapLibre(${centre.id})" style="width: 100%; text-align: center; background: #0B2545; color: #FDE047; padding: 6px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #1E3A8A; cursor: pointer;">
              ✓ Select this Mandi
            </button>
            <div style="display: flex; gap: 4px;">
              <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #F1F5F9; color: #0B2545; border: 1px solid #CBD5E1; padding: 5px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
                <span>🧭 Directions</span>
              </a>
              <a href="/farmer/book?centre=${centre.id}" style="flex: 1; text-align: center; background: #15803D; color: white; padding: 5px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
                <span>📅 Book Slot</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([centre.longitude, centre.latitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => {
        if (onSelectCentre) {
          onSelectCentre(centre);
        }
      });

      markersRef.current.push(marker);
      bounds.extend([centre.longitude, centre.latitude]);
    });

    // 3. Draw Route Line via OSRM
    if (farmerLocation && targetCentre) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${farmerLocation.lng},${farmerLocation.lat};${targetCentre.longitude},${targetCentre.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);

        let geojsonCoordinates: [number, number][] = [];
        let distanceKm = 0;
        let durationMin = 0;

        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            geojsonCoordinates = route.geometry.coordinates;
            distanceKm = Number((route.distance / 1000).toFixed(1));
            durationMin = Math.round(route.duration / 60);
          }
        }

        if (geojsonCoordinates.length === 0) {
          geojsonCoordinates = [
            [farmerLocation.lng, farmerLocation.lat],
            [targetCentre.longitude, targetCentre.latitude],
          ];
          const directDist = targetCentre.calculated_distance_km ?? targetCentre.distance_km ?? 15;
          distanceKm = Number(directDist.toFixed(1));
          durationMin = Math.round((directDist / 45) * 60);
        }

        const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation.lat},${farmerLocation.lng}&destination=${targetCentre.latitude},${targetCentre.longitude}`;

        setRouteInfo({
          targetName: targetCentre.name,
          distanceKm,
          durationMin,
          navUrl,
        });

        if (map.getSource("route-source")) {
          map.getSource("route-source").setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: geojsonCoordinates,
            },
          });
        } else {
          map.addSource("route-source", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: geojsonCoordinates,
              },
            },
          });

          map.addLayer({
            id: "route-layer-outline",
            type: "line",
            source: "route-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#FFFFFF", "line-width": 7, "line-opacity": 0.8 },
          });

          map.addLayer({
            id: "route-layer",
            type: "line",
            source: "route-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2563EB", "line-width": 5, "line-opacity": 1.0 },
          });
        }
      } catch {
        // Fallback handled gracefully
      }
    } else {
      setRouteInfo(null);
    }

    // Auto-fit bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 800 });
    }
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-300 shadow-sm ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Dynamic Route Telemetry HUD */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs border-2 border-[#0B2545] rounded-md px-3 py-2 shadow-lg text-xs max-w-[280px] sm:max-w-xs animate-in fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase text-[#0B2545] flex items-center gap-1">
              <span>🚗</span>
              <span>Driving Route (OSRM)</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
              Direct
            </span>
          </div>
          <p className="font-bold text-[#0B2545] text-xs truncate" title={routeInfo.targetName}>
            To: {routeInfo.targetName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-slate-700">
            <span className="font-black text-sm text-[#0B2545]">
              {routeInfo.distanceKm} km
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-amber-700">
              ~{routeInfo.durationMin} min drive
            </span>
          </div>
          <a
            href={routeInfo.navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center bg-[#0B2545] hover:bg-[#133E68] text-white font-bold py-1 px-2 rounded text-[11px] transition"
          >
            Open in GPS Navigation →
          </a>
        </div>
      )}

      {/* Attribution & Legend Footer */}
      <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[10px] font-bold text-slate-700 border border-slate-200 flex items-center gap-3 shadow-xs">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0B2545]"></span> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]"></span> Nearest
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Selected
        </span>
        <span className="flex items-center gap-1 text-blue-700">
          <span className="w-3.5 h-1 bg-[#2563EB] rounded inline-block"></span> Solid Route
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600 font-normal">MapLibre Vector Engine</span>
      </div>
    </div>
  );
}

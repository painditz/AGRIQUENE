"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { CentreItem } from "@/lib/api";
import { Map, Layers, Navigation, Eye } from "lucide-react";

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

// Strict coordinate validator
function isValidCoord(lat: any, lng: any): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function LeafletMandiMap({
  centres = [],
  farmerLocation,
  selectedCentreId,
  nearestCentreId,
  onSelectCentre,
  className = "",
  height = "460px",
}: LeafletMandiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const renderGenRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Map view mode: 'nearby' focuses on closest centres & driving route; 'national' shows all-India network
  const [mapMode, setMapMode] = useState<"nearby" | "national">("nearby");
  const [showAllMandis, setShowAllMandis] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(7);

  const [routeInfo, setRouteInfo] = useState<{
    targetName: string;
    distanceKm: number;
    durationMin: number;
    navUrl: string;
  } | null>(null);

  // Expose global callback for Leaflet popup HTML buttons
  useEffect(() => {
    (window as any).selectMandiFromLeaflet = (id: number) => {
      const c = centres.find((x) => x.id === id);
      if (c && onSelectCentre) {
        onSelectCentre(c);
      }
    };
    return () => {
      delete (window as any).selectMandiFromLeaflet;
    };
  }, [centres, onSelectCentre]);

  // Decluttering logic (Requirement 3):
  // Filter mandis based on zoom, proximity, and user selection so markers don't overlap into an unreadable mess
  const visibleCentres = useMemo(() => {
    const valid = centres.filter((c) => isValidCoord(c.latitude, c.longitude));
    if (valid.length === 0) return [];

    // If user explicitly toggled "Show All" or in national mode, return all
    if (showAllMandis || mapMode === "national") {
      return valid;
    }

    // In 'nearby' mode or default zoom:
    // Always include selected and nearest centres
    const mustInclude = new Set<number>();
    if (selectedCentreId) mustInclude.add(selectedCentreId);
    if (nearestCentreId) mustInclude.add(nearestCentreId);

    // If zoomed in close (zoom >= 9), show all within view or up to 40
    if (currentZoom >= 9) {
      return valid;
    }

    // If farmer location is known, sort by distance and pick top 18 closest + must include
    if (farmerLocation && isValidCoord(farmerLocation.lat, farmerLocation.lng)) {
      const sorted = [...valid].sort(
        (a, b) =>
          (a.calculated_distance_km ?? a.distance_km ?? 9999) -
          (b.calculated_distance_km ?? b.distance_km ?? 9999)
      );

      const topNearby = sorted.slice(0, 18);
      topNearby.forEach((c) => mustInclude.add(c.id));
      return valid.filter((c) => mustInclude.has(c.id));
    }

    // Default: Top 25 regional centres
    const firstSlice = valid.slice(0, 25);
    firstSlice.forEach((c) => mustInclude.add(c.id));
    return valid.filter((c) => mustInclude.has(c.id));
  }, [centres, showAllMandis, mapMode, currentZoom, farmerLocation, selectedCentreId, nearestCentreId]);

  // Safe marker & polyline renderer
  const renderLayers = useCallback(async (L: any, map: any) => {
    const currentGen = ++renderGenRef.current;

    // Abort previous route fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Strict validation: map must exist, be loaded, and container must be attached
    if (!map || !map._loaded || !mapContainerRef.current || !isMountedRef.current) {
      return;
    }

    // Container size check: if 0x0, postpone
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) {
      setTimeout(() => {
        if (isMountedRef.current && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
            renderLayers(L, mapInstanceRef.current);
          } catch {}
        }
      }, 100);
      return;
    }

    // Atomically clear old layers using LayerGroup (prevents _leaflet_pos race condition)
    if (markersLayerRef.current) {
      try {
        markersLayerRef.current.clearLayers();
      } catch {}
    }
    if (routeLayerRef.current) {
      try {
        routeLayerRef.current.clearLayers();
      } catch {}
    }

    const boundsLatLngs: [number, number][] = [];

    // 1. Farmer Location Marker
    const hasValidFarmer = farmerLocation && isValidCoord(farmerLocation.lat, farmerLocation.lng);
    if (hasValidFarmer) {
      const fLat = farmerLocation!.lat;
      const fLng = farmerLocation!.lng;

      try {
        const farmerIcon = L.divIcon({
          className: "custom-farmer-pin",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
              <div style="background: #0B2545; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                <span>📍</span>
                <span>Your Location</span>
              </div>
              <div style="width: 14px; height: 14px; background: #0B2545; border: 3px solid #60A5FA; border-radius: 50%; box-shadow: 0 0 10px #3B82F6; margin-top: 2px;"></div>
            </div>
          `,
          iconSize: [30, 42],
          iconAnchor: [15, 42],
        });

        const farmerMarker = L.marker([fLat, fLng], { icon: farmerIcon })
          .bindPopup(`
            <div style="font-family: inherit; padding: 4px; font-size: 12px;">
              <strong style="color: #0B2545; font-size: 13px;">📍 Your Location</strong>
              <p style="margin: 4px 0 0 0; color: #475569;">${farmerLocation!.name || "Selected Farm / Village"}</p>
            </div>
          `);

        if (markersLayerRef.current) {
          markersLayerRef.current.addLayer(farmerMarker);
        }
        boundsLatLngs.push([fLat, fLng]);
      } catch {}
    }

    // 2. Mandi Markers (Render from visibleCentres)
    visibleCentres.forEach((centre) => {
      const isNearest = centre.id === nearestCentreId;
      const isSelected = centre.id === selectedCentreId;
      const distance =
        centre.calculated_distance_km !== undefined
          ? centre.calculated_distance_km
          : centre.distance_km;

      const pinBg = isNearest ? "#B91C1C" : isSelected ? "#059669" : "#0B2545";
      const pinBorder = isNearest ? "#FEF08A" : isSelected ? "#A7F3D0" : "#FFFFFF";

      try {
        const mandiIcon = L.divIcon({
          className: "custom-mandi-pin",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
              ${
                isNearest
                  ? `<div style="background: #FEF08A; color: #854D0E; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 1px solid #FACC15;">★ Nearest</div>`
                  : isSelected
                  ? `<div style="background: #D1FAE5; color: #065F46; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; margin-bottom: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 1px solid #A7F3D0;">✓ Selected</div>`
                  : ""
              }
              <div style="background: ${pinBg}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.25); border: 2.5px solid ${pinBorder};">
                <span style="transform: rotate(45deg); font-size: 16px;">🌾</span>
              </div>
            </div>
          `,
          iconSize: [36, 44],
          iconAnchor: [18, 44],
        });

        const navUrl = hasValidFarmer
          ? `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation!.lat},${farmerLocation!.lng}&destination=${centre.latitude},${centre.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${centre.latitude},${centre.longitude}`;

        const popupContent = `
          <div style="font-family: inherit; padding: 2px; min-width: 230px; font-size: 12px; color: #0F172A;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${isNearest ? "#B91C1C" : "#0B2545"};">
                ${isNearest ? "★ NEAREST PROCUREMENT CENTRE" : "PROCUREMENT CENTRE"}
              </span>
              <span style="font-size: 9px; font-weight: bold; background: ${centre.status === "OPEN" ? "#DCFCE7" : "#FEF3C7"}; color: ${centre.status === "OPEN" ? "#166534" : "#92400E"}; padding: 1px 5px; border-radius: 4px;">
                ${centre.status || "OPEN"}
              </span>
            </div>

            <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0B2545; line-height: 1.3;">${centre.name}</h4>
            <p style="margin: 2px 0 6px 0; font-size: 11px; color: #64748B;">${centre.address}</p>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
              <div>
                <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Distance</span>
                <strong style="color: #0B2545; font-size: 12px;">${distance != null ? `${Number(distance).toFixed(1)} km away` : "Select location"}</strong>
              </div>
              <div>
                <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Estimated Wait</span>
                <strong style="color: #B91C1C; font-size: 12px;">~${centre.estimated_wait_min ?? 0} min</strong>
              </div>
              <div>
                <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Farmers in line</span>
                <strong style="color: #0F172A;">${centre.current_waiting_count ?? 0} waiting</strong>
              </div>
              <div>
                <span style="color: #64748B; display: block; font-size: 9px; text-transform: uppercase;">Open Desks</span>
                <strong style="color: #0F172A;">${centre.active_counters ?? 4} counters</strong>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button onclick="window.selectMandiFromLeaflet(${centre.id})" style="width: 100%; text-align: center; background: #0B2545; color: #FDE047; padding: 6px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #1E3A8A; cursor: pointer;">
                ✓ Choose this Mandi
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

        const marker = L.marker([centre.latitude, centre.longitude], { icon: mandiIcon })
          .bindPopup(popupContent);

        marker.on("click", () => {
          if (onSelectCentre) onSelectCentre(centre);
        });

        if (markersLayerRef.current) {
          markersLayerRef.current.addLayer(marker);
        }
      } catch {}
    });

    const targetCentre =
      visibleCentres.find((c) => c.id === selectedCentreId) ||
      visibleCentres.find((c) => c.id === nearestCentreId) ||
      (visibleCentres.length > 0 ? visibleCentres[0] : null);

    if (targetCentre && isValidCoord(targetCentre.latitude, targetCentre.longitude)) {
      boundsLatLngs.push([targetCentre.latitude, targetCentre.longitude]);
    } else if (!hasValidFarmer && visibleCentres.length > 0) {
      visibleCentres.slice(0, 3).forEach((c) => {
        if (isValidCoord(c.latitude, c.longitude)) {
          boundsLatLngs.push([c.latitude, c.longitude]);
        }
      });
    }

    if (hasValidFarmer && targetCentre && isValidCoord(targetCentre.latitude, targetCentre.longitude)) {
      const farmerPt: [number, number] = [farmerLocation!.lat, farmerLocation!.lng];
      const centrePt: [number, number] = [targetCentre.latitude, targetCentre.longitude];

      const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation!.lat},${farmerLocation!.lng}&destination=${targetCentre.latitude},${targetCentre.longitude}`;
      const directDist = targetCentre.calculated_distance_km ?? targetCentre.distance_km ?? 15;
      const estDurationMin = Math.max(5, Math.round((directDist / 45) * 60));

      setRouteInfo({
        targetName: targetCentre.name,
        distanceKm: directDist,
        durationMin: estDurationMin,
        navUrl,
      });

      let routeDrawn = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${farmerLocation!.lng},${farmerLocation!.lat};${targetCentre.longitude},${targetCentre.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (currentGen === renderGenRef.current && isMountedRef.current && mapInstanceRef.current && res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const rawCoords = data.routes[0].geometry.coordinates;
            const validCoords = rawCoords
              .filter((c: any) => Array.isArray(c) && isValidCoord(c[1], c[0]))
              .map((c: [number, number]) => [c[1], c[0]]);

            if (validCoords.length > 0 && routeLayerRef.current) {
              const roadDistKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
              const roadDurationMin = Math.max(5, Math.round(data.routes[0].duration / 60));

              setRouteInfo({
                targetName: targetCentre.name,
                distanceKm: roadDistKm,
                durationMin: roadDurationMin,
                navUrl,
              });

              // Crucial fix: noClip: true skips Leaflet internal clipPolygon accessing bounds.min.x
              const casing = L.polyline(validCoords, {
                color: "#FFFFFF",
                weight: 8,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
                noClip: true,
              });

              const mainLine = L.polyline(validCoords, {
                color: "#2563EB",
                weight: 5,
                opacity: 1.0,
                lineCap: "round",
                lineJoin: "round",
                noClip: true,
              });

              const innerLine = L.polyline(validCoords, {
                color: "#93C5FD",
                weight: 2,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
                noClip: true,
              });

              routeLayerRef.current.addLayer(casing);
              routeLayerRef.current.addLayer(mainLine);
              routeLayerRef.current.addLayer(innerLine);
              routeDrawn = true;
            }
          }
        }
      } catch {}

      // Fallback direct geodesic line if OSRM timed out
      if (!routeDrawn && currentGen === renderGenRef.current && isMountedRef.current && routeLayerRef.current) {
        try {
          const fallbackCasing = L.polyline([farmerPt, centrePt], {
            color: "#FFFFFF",
            weight: 7,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
            noClip: true,
          });

          const fallbackMain = L.polyline([farmerPt, centrePt], {
            color: "#2563EB",
            weight: 4.5,
            opacity: 1.0,
            lineCap: "round",
            lineJoin: "round",
            noClip: true,
          });

          routeLayerRef.current.addLayer(fallbackCasing);
          routeLayerRef.current.addLayer(fallbackMain);
        } catch {}
      }
    } else {
      setRouteInfo(null);
    }

    // Auto-fit bounds safely with dimensions verification
    if (currentGen === renderGenRef.current && isMountedRef.current && map && map._loaded) {
      try {
        const currentSize = map.getSize();
        if (currentSize && currentSize.x > 0 && currentSize.y > 0) {
          try {
            if (boundsLatLngs.length > 1) {
              const validBounds = boundsLatLngs.filter((pt) => isValidCoord(pt[0], pt[1]));
              if (validBounds.length > 1) {
                map.fitBounds(validBounds, {
                  padding: [45, 45],
                  maxZoom: 13,
                  animate: false,
                });
              }
            } else if (boundsLatLngs.length === 1 && isValidCoord(boundsLatLngs[0][0], boundsLatLngs[0][1])) {
              map.setView(boundsLatLngs[0], 11, { animate: false });
            }
          } catch (e) {
            // Container may be transitioning or zero-sized
          }
        }
      } catch {}
    }
  }, [visibleCentres, farmerLocation, selectedCentreId, nearestCentreId, onSelectCentre]);

  // Lifecycle: Map Initialization
  useEffect(() => {
    isMountedRef.current = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      // Clean up previous instance safely
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {}
      }

      if (!isMountedRef.current || !mapContainerRef.current) return;

      // Safe default center: India / NCR
      let defaultCenter: [number, number] = [28.6139, 77.2090];
      let defaultZoom = 7;

      if (farmerLocation && isValidCoord(farmerLocation.lat, farmerLocation.lng)) {
        defaultCenter = [farmerLocation.lat, farmerLocation.lng];
        defaultZoom = 10;
      } else {
        const validFirst = centres.find((c) => isValidCoord(c.latitude, c.longitude));
        if (validFirst) {
          defaultCenter = [validFirst.latitude, validFirst.longitude];
        }
      }

      try {
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        mapInstanceRef.current = map;

        // Tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Dedicated LayerGroups for atomic management
        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

        // Zoom change listener for dynamic decluttering
        map.on("zoomend", () => {
          if (isMountedRef.current && mapInstanceRef.current) {
            try {
              setCurrentZoom(mapInstanceRef.current.getZoom());
            } catch {}
          }
        });

        // ResizeObserver to handle container layout changes
        if (typeof window !== "undefined" && window.ResizeObserver && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (isMountedRef.current && mapInstanceRef.current && mapInstanceRef.current._loaded) {
              try {
                if (mapContainerRef.current && mapContainerRef.current.offsetParent !== null && mapContainerRef.current.clientHeight > 0) {
                  mapInstanceRef.current.invalidateSize({ animate: false });
                }
              } catch {}
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        // Wait until Leaflet is fully ready before rendering initial layers
        map.whenReady(() => {
          if (isMountedRef.current && mapInstanceRef.current) {
            try {
              mapInstanceRef.current.invalidateSize({ animate: false });
            } catch {}
            renderLayers(L, mapInstanceRef.current);
          }
        });
      } catch (err) {
        console.warn("Leaflet map initialization skipped or postponed:", err);
      }
    }

    initMap();

    return () => {
      isMountedRef.current = false;
      renderGenRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {}
      }
    };
  }, []);

  // Update layers when dependencies change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._loaded) return;

    import("leaflet").then((leafletModule) => {
      if (isMountedRef.current && mapInstanceRef.current && mapInstanceRef.current._loaded) {
        renderLayers(leafletModule.default, mapInstanceRef.current);
      }
    });
  }, [renderLayers]);

  return (
    <div className={`relative rounded-md border-2 border-[#0B2545] overflow-hidden shadow-sm ${className}`}>
      {/* Top Map Control Bar */}
      <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-1.5 flex-wrap">
        {/* Dual Map View Switcher (Requirement 4) */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-300 rounded px-1 py-0.5 shadow-md flex items-center gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setMapMode("nearby");
              setShowAllMandis(false);
            }}
            className={`px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
              mapMode === "nearby"
                ? "bg-[#0B2545] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Navigation className="w-3 h-3 text-amber-300" />
            <span>Nearby Route View</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMapMode("national");
              setShowAllMandis(true);
            }}
            className={`px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
              mapMode === "national"
                ? "bg-[#0B2545] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3 h-3 text-blue-300" />
            <span>National Mandi Radar</span>
          </button>
        </div>

        {/* Clutter / Density Toggle (Requirement 3) */}
        {centres.length > visibleCentres.length && (
          <button
            type="button"
            onClick={() => setShowAllMandis(!showAllMandis)}
            className="bg-white/95 backdrop-blur-sm border border-slate-300 rounded px-2.5 py-1 shadow-md text-[10px] font-bold text-slate-700 hover:text-[#0B2545] transition flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3 h-3 text-[#B91C1C]" />
            <span>
              {showAllMandis ? `Showing All (${centres.length})` : `Showing ${visibleCentres.length} of ${centres.length} Mandis`}
            </span>
          </button>
        )}
      </div>

      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ height, width: "100%", zIndex: 1 }} />

      {/* Top Right Legend */}
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
        <div className="flex items-center gap-1.5 text-blue-700 font-bold pt-1 border-t border-slate-200">
          <span className="w-4 h-1 bg-[#2563EB] rounded inline-block" />
          <span>━ Driving Route</span>
        </div>
      </div>

      {/* Bottom Floating Direct Route HUD */}
      {routeInfo && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md bg-white/95 backdrop-blur-sm border-2 border-[#0B2545] rounded-md p-3 shadow-lg z-[400] flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[9px] font-extrabold uppercase text-[#B91C1C] tracking-wide block">
              Direct Travel Route
            </span>
            <p className="font-bold text-[#0B2545] truncate max-w-[200px] sm:max-w-[240px]">
              {routeInfo.targetName}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
              <span>{routeInfo.distanceKm.toFixed(1)} km</span>
              <span>•</span>
              <span className="font-semibold text-slate-800">~{routeInfo.durationMin} min drive</span>
            </div>
          </div>

          <a
            href={routeInfo.navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0B2545] hover:bg-[#133E68] text-white px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            <span>🧭 Directions</span>
          </a>
        </div>
      )}
    </div>
  );
}

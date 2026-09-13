"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Navigation, Loader2, X, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { api, LocationSearchResult } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export interface SelectedLocation {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
  pin_code?: string;
  village?: string;
  town?: string;
  mandi_name?: string;
  centre_id?: number;
}

interface AddressAutocompleteProps {
  onLocationSelect: (location: SelectedLocation) => void;
  initialAddress?: string;
  placeholder?: string;
  className?: string;
}

interface UniversalLocationItem {
  id: string;
  displayName: string;
  shortName: string;
  village?: string;
  town?: string;
  district: string;
  state: string;
  pin_code?: string;
  lat: number;
  lng: number;
  mandi_name?: string;
  centre_id?: number;
}

export function AddressAutocomplete({
  onLocationSelect,
  initialAddress = "",
  placeholder,
  className = "",
}: AddressAutocompleteProps) {
  const { t, lang } = useLanguage();

  const isHindi = lang === "hi";
  const defaultPlaceholder = isHindi
    ? "गाँव, कस्बा, जिला या मंडी खोजें"
    : "Search village, town, district or mandi";

  const inputPlaceholder = placeholder || defaultPlaceholder;

  const [query, setQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<UniversalLocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<UniversalLocationItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hybrid Search: 1st checks Backend Database API -> 2nd OpenStreetMap Nominatim
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setStatusMessage(null);
      return;
    }

    setIsSearching(true);
    setStatusMessage(isHindi ? "स्थान खोजा जा रहा है..." : "Searching location...");
    setStatusType("info");

    const items: UniversalLocationItem[] = [];

    // 1. Try Backend Local Database / Mandi Search first
    try {
      const backendResults = await api.searchLocations(trimmed);
      if (Array.isArray(backendResults) && backendResults.length > 0) {
        backendResults.forEach((b) => {
          items.push({
            id: b.place_id,
            displayName: b.display_name,
            shortName: b.village || b.town || b.district,
            village: b.village,
            town: b.town,
            district: b.district,
            state: b.state,
            pin_code: b.pin_code,
            lat: b.latitude,
            lng: b.longitude,
            mandi_name: b.mandi_name,
            centre_id: b.centre_id,
          });
        });
      }
    } catch {
      // Continue to public Nominatim fallback
    }

    // 2. OpenStreetMap Nominatim for Indian villages & pin codes
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=in&addressdetails=1&limit=6`;
      
      const res = await fetch(url, {
        headers: {
          "Accept-Language": isHindi ? "hi,en" : "en,hi",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const short =
              item.address?.village ||
              item.address?.town ||
              item.address?.city ||
              item.address?.suburb ||
              item.display_name.split(",")[0];
            const dist = item.address?.state_district || item.address?.county || item.address?.city || "";
            const st = item.address?.state || "";
            const pin = item.address?.postcode || "";

            // Avoid duplicate ids
            if (!items.some((x) => Math.abs(x.lat - parseFloat(item.lat)) < 0.005 && Math.abs(x.lng - parseFloat(item.lon)) < 0.005)) {
              items.push({
                id: `osm-${item.place_id}`,
                displayName: item.display_name,
                shortName: short,
                village: item.address?.village || short,
                town: item.address?.town || item.address?.city,
                district: dist,
                state: st,
                pin_code: pin,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              });
            }
          });
        }
      }
    } catch {
      // Handled below
    }

    setIsSearching(false);
    setSuggestions(items);

    if (items.length === 0) {
      setStatusMessage(
        isHindi
          ? "कोई स्थान नहीं मिला। कृपया गाँव, कस्बा या जिला नाम जाँचें।"
          : "No matching location found. Please check spelling or enter manually."
      );
      setStatusType("error");
      setIsOpen(false);
    } else {
      setStatusMessage(null);
      setIsOpen(true);
    }
  }, [isHindi]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedLocation(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 320);
  };

  const handleSelect = (item: UniversalLocationItem) => {
    setQuery(item.displayName);
    setSelectedLocation(item);
    setSuggestions([]);
    setIsOpen(false);
    setStatusMessage(isHindi ? "स्थान चुना गया" : "Location selected");
    setStatusType("success");

    onLocationSelect({
      name: item.shortName,
      displayName: item.displayName,
      lat: item.lat,
      lng: item.lng,
      district: item.district,
      state: item.state,
      pin_code: item.pin_code,
      village: item.village || item.shortName,
      town: item.town,
      mandi_name: item.mandi_name,
      centre_id: item.centre_id,
    });
  };

  // Robust Geolocation: Handles timeout, permissions, retry, reverse-geocoding
  const handleUseCurrentLocation = () => {
    setGeoDenied(false);

    if (!navigator.geolocation) {
      setStatusMessage(
        isHindi
          ? "आपके ब्राउज़र में जीपीएस सुविधा उपलब्ध नहीं है। कृपया स्थान हाथ से खोजें।"
          : "Location access is unavailable on this device. Please search manually."
      );
      setStatusType("error");
      return;
    }

    setIsGeoLoading(true);
    setStatusMessage(isHindi ? "आपकी वर्तमान लोकेशन जांची जा रही है..." : "Detecting your current location...");
    setStatusType("info");

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000, // 5 min cache for battery & speed
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        let detectedItem: UniversalLocationItem | null = null;

        // 1. Try Backend Reverse Geocoding first
        try {
          const rev = await api.reverseGeocode(lat, lng);
          if (rev) {
            detectedItem = {
              id: rev.place_id,
              displayName: rev.display_name,
              shortName: rev.village || rev.town || rev.district,
              village: rev.village,
              town: rev.town,
              district: rev.district,
              state: rev.state,
              pin_code: rev.pin_code,
              lat: rev.latitude,
              lng: rev.longitude,
              mandi_name: rev.mandi_name,
              centre_id: rev.centre_id,
            };
          }
        } catch {
          // Continue to OSM Nominatim
        }

        // 2. OSM Nominatim Reverse fallback
        if (!detectedItem) {
          try {
            const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
            const res = await fetch(revUrl, {
              headers: { "Accept-Language": isHindi ? "hi,en" : "en,hi" },
            });
            if (res.ok) {
              const data = await res.json();
              const short =
                data.address?.village ||
                data.address?.town ||
                data.address?.city ||
                data.address?.suburb ||
                "Your Farm Location";
              const dist = data.address?.state_district || data.address?.county || data.address?.city || "Delhi";
              const st = data.address?.state || "Delhi";
              const pin = data.address?.postcode || "";

              detectedItem = {
                id: `rev-${data.place_id || "gps"}`,
                displayName: data.display_name || `${short}, ${dist}, ${st}`,
                shortName: short,
                village: data.address?.village || short,
                town: data.address?.town || data.address?.city,
                district: dist,
                state: st,
                pin_code: pin,
                lat,
                lng,
              };
            }
          } catch {
            // Coordinate fallback
          }
        }

        // 3. Final Coordinate fallback if network is completely offline
        if (!detectedItem) {
          detectedItem = {
            id: "gps-coord",
            displayName: `GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
            shortName: "Current Farm GPS",
            village: "Local Area",
            town: "Local Mandi Hub",
            district: "National Capital Region",
            state: "Delhi",
            pin_code: "110040",
            lat,
            lng,
          };
        }

        setIsGeoLoading(false);
        setQuery(detectedItem.displayName);
        setSelectedLocation(detectedItem);
        setStatusMessage(
          isHindi
            ? `लोकेशन प्राप्त हुई: ${detectedItem.shortName}`
            : `Location detected: ${detectedItem.shortName}`
        );
        setStatusType("success");

        onLocationSelect({
          name: detectedItem.shortName,
          displayName: detectedItem.displayName,
          lat: detectedItem.lat,
          lng: detectedItem.lng,
          district: detectedItem.district,
          state: detectedItem.state,
          pin_code: detectedItem.pin_code,
          village: detectedItem.village,
          town: detectedItem.town,
          mandi_name: detectedItem.mandi_name,
          centre_id: detectedItem.centre_id,
        });
      },
      (err) => {
        setIsGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoDenied(true);
          setStatusMessage(
            isHindi
              ? "लोकेशन अनुमति अस्वीकृत कर दी गई। आप नीचे अपना गाँव या शहर हाथ से खोज सकते हैं।"
              : "Location permission was denied. You can search your location manually."
          );
          setStatusType("error");
        } else if (err.code === err.TIMEOUT) {
          setStatusMessage(
            isHindi
              ? "लोकेशन समय समाप्त हो गया। आप पुनः प्रयास कर सकते हैं या नीचे गाँव का नाम टाइप करें।"
              : "Location request timed out. You can retry or type your location manually."
          );
          setStatusType("error");
        } else {
          setStatusMessage(
            isHindi
              ? "जीपीएस सिग्नल प्राप्त नहीं हुआ। कृपया स्थान नाम से खोजें।"
              : "Position unavailable. Please search your location using the search bar."
          );
          setStatusType("error");
        }
      },
      geoOptions
    );
  };

  const clearInput = () => {
    setQuery("");
    setSelectedLocation(null);
    setSuggestions([]);
    setStatusMessage(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={inputPlaceholder}
            className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-slate-300 rounded text-xs text-slate-800 outline-none focus:border-[#0B2545] min-h-[44px]"
          />
          {query && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGeoLoading}
            className="btn-gov-outline text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 min-h-[44px] whitespace-nowrap bg-white hover:bg-slate-50 border-2 flex-1 sm:flex-none cursor-pointer"
          >
            {isGeoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0B2545]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#B91C1C]" />
            )}
            <span>
              {isGeoLoading
                ? (isHindi ? "खोज रहे हैं..." : "Detecting location...")
                : (isHindi ? "मेरी वर्तमान लोकेशन का उपयोग करें" : "Use My Current Location")}
            </span>
          </button>

          {geoDenied && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="px-3 py-2 text-xs font-bold text-[#0B2545] border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
              title="Try GPS Again"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isHindi ? "पुनः प्रयास करें" : "Try Again"}</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded font-medium ${
            statusType === "error"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : statusType === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "text-slate-600"
          }`}
        >
          {isSearching || isGeoLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#0B2545]" />
          ) : statusType === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border-2 border-[#0B2545] rounded shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
          {suggestions.map((item) => {
            const parts = item.displayName.split(",");
            const primary = parts.slice(0, 2).join(",");
            const secondary = parts.slice(2).join(",");

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 hover:bg-blue-50 transition flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-[#0B2545] truncate">{primary}</p>
                    {item.mandi_name && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Mandi Hub
                      </span>
                    )}
                  </div>
                  {secondary && <p className="text-[11px] text-slate-500 truncate">{secondary.trim()}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Navigation, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";

export interface SelectedLocation {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
}

interface AddressAutocompleteProps {
  onLocationSelect: (location: SelectedLocation) => void;
  initialAddress?: string;
  placeholder?: string;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    village?: string;
    town?: string;
    city?: string;
    state_district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export function AddressAutocomplete({
  onLocationSelect,
  initialAddress = "",
  placeholder = "Search your village, town or address...",
  className = "",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(initialAddress || null);

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

  const searchAddress = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setStatusMessage("Finding locations...");

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=in&addressdetails=1&limit=5`;
      
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "en,hi",
        },
      });

      if (!res.ok) {
        throw new Error("Search failed");
      }

      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      if (data.length === 0) {
        setStatusMessage("We couldn't find that location. Please try another address.");
      } else {
        setStatusMessage(null);
        setIsOpen(true);
      }
    } catch {
      setStatusMessage("Search service temporarily busy. You can use your current location or try again.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedLocationName(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchAddress(val);
    }, 380);
  };

  const handleSelect = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const displayName = item.display_name;
    const shortName =
      item.address?.village ||
      item.address?.town ||
      item.address?.city ||
      displayName.split(",")[0];
    const district = item.address?.state_district || item.address?.county || "";
    const state = item.address?.state || "";

    setQuery(displayName);
    setSelectedLocationName(displayName);
    setSuggestions([]);
    setIsOpen(false);
    setStatusMessage("Location selected");

    onLocationSelect({
      name: shortName,
      displayName,
      lat,
      lng,
      district,
      state,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Location access is unavailable on this device. You can search for your address instead.");
      return;
    }

    setIsGeoLoading(true);
    setStatusMessage("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
          const res = await fetch(revUrl, {
            headers: {
              "Accept-Language": "en,hi",
            },
          });
          const data = await res.json();

          const shortName =
            data.address?.village ||
            data.address?.town ||
            data.address?.city ||
            data.address?.suburb ||
            "Your Location";
          const district = data.address?.state_district || data.address?.county || "";
          const state = data.address?.state || "";
          const displayName = data.display_name || `${shortName}, ${state}`;

          setQuery(displayName);
          setSelectedLocationName(displayName);
          setStatusMessage("Location detected successfully");

          onLocationSelect({
            name: shortName,
            displayName,
            lat,
            lng,
            district,
            state,
          });
        } catch {
          const fallbackName = "Your Current Location";
          setQuery(fallbackName);
          setSelectedLocationName(fallbackName);
          setStatusMessage("Location detected successfully");

          onLocationSelect({
            name: fallbackName,
            displayName: fallbackName,
            lat,
            lng,
          });
        } finally {
          setIsGeoLoading(false);
        }
      },
      (err) => {
        setIsGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatusMessage("Location permission was denied. You can type your village or town name in the box above.");
        } else if (err.code === err.TIMEOUT) {
          setStatusMessage("Location request timed out. Please type your location manually.");
        } else {
          setStatusMessage("Location access is unavailable. You can search for your address instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const clearInput = () => {
    setQuery("");
    setSelectedLocationName(null);
    setSuggestions([]);
    setStatusMessage(null);
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
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-slate-300 rounded text-xs text-slate-800 outline-none focus:border-[#0B2545] min-h-[44px]"
          />
          {query && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGeoLoading}
          className="btn-gov-outline text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 min-h-[44px] whitespace-nowrap bg-white hover:bg-slate-50 border-2"
        >
          {isGeoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0B2545]" />
          ) : (
            <Navigation className="w-4 h-4 text-[#B91C1C]" />
          )}
          <span>{isGeoLoading ? "Finding location..." : "Use My Current Location"}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="text-[11px] flex items-center gap-1.5 px-2 py-1 rounded font-medium text-slate-600">
          {isSearching || isGeoLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#0B2545]" />
          ) : selectedLocationName ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border-2 border-[#0B2545] rounded shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
          {suggestions.map((item) => {
            const parts = item.display_name.split(",");
            const primary = parts.slice(0, 2).join(",");
            const secondary = parts.slice(2).join(",");

            return (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 hover:bg-blue-50 transition flex items-start gap-2.5 text-xs text-slate-800"
              >
                <MapPin className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0B2545] truncate">{primary}</p>
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

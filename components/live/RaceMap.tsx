"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import { RunnerMarker } from "./RunnerMarker";
import { RunnersSidebar } from "./RunnersSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MapPin, Loader2 } from "lucide-react";
import type { PositionsResponse } from "@/types/live-race";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths for Next.js
// Note: These icons are not used by our custom runners, but required for timing mat marker
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface RaceMapProps {
  bibFilter?: number[]; // Optional filter for specific bibs
  refreshInterval?: number; // Milliseconds (default 5000)
}

// Custom timing mat icon
const timingMatIcon = L.divIcon({
  html: `
    <div style="
      background-color: #10b981;
      border: 3px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  className: "timing-mat-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

export function RaceMap({ bibFilter, refreshInterval = 5000 }: RaceMapProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      const params = new URLSearchParams();
      if (bibFilter && bibFilter.length > 0) {
        params.set("bibs", bibFilter.join(","));
      }

      const url = `/api/race/positions${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      const positionsData = await response.json();
      setData(positionsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching positions:", err);
      setError(err instanceof Error ? err.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, refreshInterval);
    return () => clearInterval(interval);
  }, [bibFilter, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t.live?.loadingMap || "Loading map..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-destructive/10 rounded-lg">
        <div className="text-center text-destructive">
          <p className="font-semibold mb-1">{t.common?.error || "Error"}</p>
          <p className="text-sm">{error || "Failed to load map data"}</p>
        </div>
      </div>
    );
  }

  // Calculate bounds for the map - ONLY use course track to always show entire course
  const bounds: [number, number][] = [];

  if (data.courseTrack.length > 0) {
    // Add all course track points to ensure entire course is visible
    data.courseTrack.forEach((point) => {
      bounds.push([point.lat, point.lon]);
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Map Container */}
      <div className="flex-1 relative rounded-lg overflow-hidden border shadow-lg">
        <MapContainer
          bounds={bounds.length > 0 ? bounds : undefined}
          boundsOptions={{ padding: [30, 30] }}
          style={{ height: "600px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Course track */}
          {data.courseTrack.length > 0 && (
            <Polyline
              positions={data.courseTrack.map((p) => [p.lat, p.lon])}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
            />
          )}

          {/* Timing mat marker */}
          <Marker
            position={[data.timingMatPosition.lat, data.timingMatPosition.lon]}
            icon={timingMatIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="font-semibold">
                  {t.live?.timingMat || "Timing Mat"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.live?.startFinishLine || "Start/Finish Line"}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Runner markers */}
          {data.positions.map((runner) => (
            <RunnerMarker key={runner.bib} runner={runner} />
          ))}
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border z-[1000]">
          <div className="text-xs font-semibold mb-2">
            {t.live?.legend || "Legend"}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#fbbf24] border-2 border-white" />
              <span>1st Place</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#9ca3af] border-2 border-white" />
              <span>2nd-3rd</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#cd7f32] border-2 border-white" />
              <span>4th-10th</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-white" />
              <span>Others</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#f97316] border-2 border-white" />
              <span>{t.live?.overdue || "Overdue"}</span>
            </div>
          </div>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border z-[1000]">
          <div className="text-xs space-y-1">
            <div>
              <span className="font-semibold">
                {t.live?.onCourse || "On Course"}:
              </span>{" "}
              <span className="tabular-nums">{data.positions.length}</span>
            </div>
            <div>
              <span className="font-semibold">
                {t.live?.onBreak || "On Break"}:
              </span>{" "}
              <span className="tabular-nums">{data.onBreak.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Runners Sidebar - On right side on large screens */}
      <div className="lg:w-80 w-full">
        <RunnersSidebar 
          runnersOnTrack={data.positions} 
          runnersOnBreak={data.onBreak} 
        />
      </div>
    </div>
  );
}

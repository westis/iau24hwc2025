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

// Custom timing mat icon - pin/teardrop shape pointing to exact location
const timingMatIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
      <path d="M20 0 C10 0, 2 8, 2 18 C2 28, 20 50, 20 50 C20 50, 38 28, 38 18 C38 8, 30 0, 20 0 Z" 
            fill="#10b981" 
            stroke="white" 
            stroke-width="2"/>
      <circle cx="20" cy="18" r="6" fill="white"/>
      <text x="20" y="23" font-size="12" font-weight="bold" fill="#10b981" text-anchor="middle">S/F</text>
    </svg>
  `,
  className: "timing-mat-marker",
  iconSize: [40, 50],
  iconAnchor: [20, 50], // Point at the bottom tip
  popupAnchor: [0, -50],
});

// Custom crew spot icon - smaller pin with Swedish flag colors (Team Sweden)
const crewSpotIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
      <path d="M14 0 C8 0, 2 5, 2 12 C2 18, 14 36, 14 36 C14 36, 26 18, 26 12 C26 5, 20 0, 14 0 Z"
            fill="#006AA7"
            stroke="white"
            stroke-width="2"/>
      <circle cx="14" cy="12" r="4" fill="#FECC00"/>
      <text x="14" y="15.5" font-size="9" font-weight="bold" fill="#006AA7" text-anchor="middle">C</text>
    </svg>
  `,
  className: "crew-spot-marker",
  iconSize: [28, 36],
  iconAnchor: [14, 36], // Point at the bottom tip
  popupAnchor: [0, -36],
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

          {/* Crew spot marker */}
          {data.crewSpotPosition && (
            <Marker
              position={[data.crewSpotPosition.lat, data.crewSpotPosition.lon]}
              icon={crewSpotIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">
                    {t.live?.crewSpot || "Crew Spot"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.live?.crewSpotOffset || "Team support area"}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Runner markers */}
          {data.positions.map((runner) => (
            <RunnerMarker
              key={runner.bib}
              runner={runner}
              courseTrack={data.courseTrack}
            />
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

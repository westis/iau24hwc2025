"use client";

import { Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { AlertCircle } from "lucide-react";
import type { RunnerPosition } from "@/types/live-race";
import { renderToString } from "react-dom/server";
import { getMarkerColor, getTextColor } from "@/lib/utils/runner-marker-colors";
import { useRef } from "react";

interface RunnerMarkerProps {
  runner: RunnerPosition;
  courseTrack: { lat: number; lon: number }[];
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function RunnerMarker({ runner, courseTrack }: RunnerMarkerProps) {
  const { t } = useLanguage();
  const color = getMarkerColor(runner.genderRank, runner.status);
  const markerRef = useRef<L.Marker>(null);

  // Calculate distance between two lat/lon points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Find nearest point on course track to snap runner position
  const findNearestPointOnTrack = (
    lat: number,
    lon: number
  ): { lat: number; lon: number } => {
    if (courseTrack.length === 0) {
      return { lat, lon };
    }

    let minDist = Infinity;
    let nearestPoint = courseTrack[0];

    courseTrack.forEach((point) => {
      const dist = calculateDistance(lat, lon, point.lat, point.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = point;
      }
    });

    return nearestPoint;
  };

  // Snap runner to nearest point on course track
  const snappedPosition = findNearestPointOnTrack(runner.lat, runner.lon);
  const displayPosition: [number, number] = [snappedPosition.lat, snappedPosition.lon];

  // Create custom divIcon with bib number
  const createCustomIcon = () => {
    const textColor = getTextColor(runner.genderRank, runner.status);

    const iconHtml = `
      <div class="runner-marker-icon ${runner.status === "overdue" ? "overdue-pulse" : ""}" style="
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        color: ${textColor};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${runner.bib}
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "custom-runner-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  return (
    <Marker
      ref={markerRef}
      position={displayPosition}
      icon={createCustomIcon()}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <ReactCountryFlag
              countryCode={getCountryCodeForFlag(runner.country)}
              svg
              style={{ width: "1.5em", height: "1em" }}
            />
            <div>
              <div className="font-semibold">{runner.name}</div>
              <div className="text-xs text-muted-foreground">
                #{runner.bib} • {runner.country}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t.live?.rank || "Rank"}:
              </span>
              <span className="font-medium">
                P{runner.rank} ({runner.gender === "m" ? "M" : "W"}
                {runner.genderRank})
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t.live?.progress || "Progress"}:
              </span>
              <span className="font-medium">
                {runner.progressPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t.live?.timeSinceLastPass || "Since last pass"}:
              </span>
              <span className="font-medium">
                {formatTime(runner.timeSinceLastPassing)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t.live?.predictedLapTime || "Est. lap time"}:
              </span>
              <span className="font-medium">
                {formatTime(runner.predictedLapTime)}
              </span>
            </div>

            {runner.status === "overdue" && (
              <div className="mt-2 flex items-center gap-1 text-orange-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>
                  {t.live?.overdue || "Overdue"} (+
                  {formatTime(runner.timeOverdue || 0)})
                </span>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

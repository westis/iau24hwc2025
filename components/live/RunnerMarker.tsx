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
import { useRef, useState, useEffect } from "react";

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

  // State for interpolated position
  const [currentProgress, setCurrentProgress] = useState(runner.progressPercent);
  const apiProgressRef = useRef(runner.progressPercent);
  const apiTimeRef = useRef(Date.now());

  // Get position at a given progress percent
  const getPositionAtProgress = (progress: number): { lat: number; lon: number } => {
    if (courseTrack.length === 0) {
      return { lat: runner.lat, lon: runner.lon };
    }

    // Clamp progress to 0-100
    const clampedProgress = Math.max(0, Math.min(100, progress));

    // Calculate index in course track
    const index = (clampedProgress / 100) * (courseTrack.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex || upperIndex >= courseTrack.length) {
      return courseTrack[lowerIndex] || courseTrack[0];
    }

    // Interpolate between points
    const fraction = index - lowerIndex;
    const p1 = courseTrack[lowerIndex];
    const p2 = courseTrack[upperIndex];

    return {
      lat: p1.lat + (p2.lat - p1.lat) * fraction,
      lon: p1.lon + (p2.lon - p1.lon) * fraction,
    };
  };

  // Update when runner data changes from API
  useEffect(() => {
    apiProgressRef.current = runner.progressPercent;
    apiTimeRef.current = Date.now();
    setCurrentProgress(runner.progressPercent);
  }, [runner.progressPercent, runner.bib]);

  // Client-side interpolation: update position every 2 seconds between API updates
  useEffect(() => {
    if (runner.status === "break") {
      // Don't interpolate if on break
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceApiUpdate = (now - apiTimeRef.current) / 1000; // seconds

      // Calculate how much progress should have been made since API update
      const progressPerSecond = (100 / runner.predictedLapTime);
      const additionalProgress = timeSinceApiUpdate * progressPerSecond;

      // New progress = API progress + additional progress from interpolation
      const newProgress = Math.min(100, apiProgressRef.current + additionalProgress);

      setCurrentProgress(newProgress);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [runner.predictedLapTime, runner.status]);

  // Get display position based on current progress
  const displayPosition = getPositionAtProgress(currentProgress);
  const positionArray: [number, number] = [displayPosition.lat, displayPosition.lon];

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
      position={positionArray}
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

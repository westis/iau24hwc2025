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
  isTop6Mode?: boolean;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function RunnerMarker({ runner, courseTrack, isTop6Mode = false }: RunnerMarkerProps) {
  const { t } = useLanguage();
  const color = getMarkerColor(runner.genderRank, runner.status, runner.gender, isTop6Mode);
  const markerRef = useRef<L.Marker>(null);

  // Use position directly from API (already pace-calculated)
  const positionArray: [number, number] = [runner.lat, runner.lon];

  // Create custom divIcon with bib number
  const createCustomIcon = () => {
    const textColor = getTextColor(runner.genderRank, runner.status, runner.gender, isTop6Mode);

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

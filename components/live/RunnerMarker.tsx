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

  // Extract initials from runner name (firstname lastname format)
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      // Assume name is "Firstname Lastname" format, so take last part first, then first part
      return `${parts[parts.length - 1][0]}${parts[0][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Create custom divIcon with avatar/initials and bib badge
  const createCustomIcon = () => {
    const textColor = getTextColor(runner.genderRank, runner.status, runner.gender, isTop6Mode);
    const initials = getInitials(runner.name);

    // Responsive sizing - smaller on mobile to avoid clutter
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const avatarSize = isMobile ? 36 : 48;
    const totalHeight = isMobile ? 44 : 56;
    const fontSize = isMobile ? 12 : 16;
    const bibFontSize = isMobile ? 9 : 11;
    const bibPadding = isMobile ? "1px 4px" : "2px 6px";

    // Styling for pending state (dashed border, semi-transparent)
    const isPending = runner.status === "pending";
    const borderWidth = isMobile ? 2 : (isPending ? 3 : 2);
    const borderStyle = isPending ? `${borderWidth}px dashed #fbbf24` : `${borderWidth}px solid white`;
    const opacity = isPending ? "0.85" : "1";

    const iconHtml = `
      <div class="runner-marker-icon ${runner.status === "overdue" ? "overdue-pulse" : ""}" style="
        position: relative;
        width: ${avatarSize}px;
        height: ${totalHeight}px;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <!-- Avatar circle or initials -->
        <div style="
          background-color: ${color};
          border: ${borderStyle};
          border-radius: 50%;
          width: ${avatarSize}px;
          height: ${avatarSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          opacity: ${opacity};
        ">
          ${runner.avatarUrl ? `
            <img
              src="${runner.avatarUrl}"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              crossorigin="anonymous"
            />
            <div style="
              display: none;
              width: 100%;
              height: 100%;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: ${fontSize}px;
              color: ${textColor};
            ">
              ${initials}
            </div>
          ` : `
            <div style="
              font-weight: bold;
              font-size: ${fontSize}px;
              color: ${textColor};
            ">
              ${initials}
            </div>
          `}
        </div>

        <!-- Bib number badge -->
        <div style="
          position: absolute;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          border: 1.5px solid white;
          border-radius: 4px;
          padding: ${bibPadding};
          font-size: ${bibFontSize}px;
          font-weight: bold;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          white-space: nowrap;
        ">
          ${runner.bib}
        </div>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "custom-runner-marker",
      iconSize: [avatarSize, totalHeight],
      iconAnchor: [avatarSize / 2, avatarSize],
      popupAnchor: [0, -avatarSize],
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
                {runner.progressPercent?.toFixed(1) ?? '0.0'}%
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

            {runner.status === "pending" && (
              <div className="mt-2 flex items-center gap-1 text-yellow-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>
                  {t.live?.pendingConfirmation || "Awaiting confirmation"}
                  {runner.timeOverdue && ` (+${formatTime(runner.timeOverdue)})`}
                </span>
              </div>
            )}

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

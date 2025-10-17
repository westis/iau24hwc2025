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
import { useEffect, useRef, useState } from "react";

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
  const prevPositionRef = useRef<[number, number] | null>(null);
  const animationRef = useRef<number | null>(null);
  const [displayPosition, setDisplayPosition] = useState<[number, number]>([
    runner.lat,
    runner.lon,
  ]);

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

  // Find nearest point index on course track
  const findNearestPointOnTrack = (
    lat: number,
    lon: number
  ): number => {
    let minDist = Infinity;
    let nearestIdx = 0;

    courseTrack.forEach((point, idx) => {
      const dist = calculateDistance(lat, lon, point.lat, point.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });

    return nearestIdx;
  };

  // Get path segments along course track between two indices
  const getPathAlongTrack = (
    startIdx: number,
    endIdx: number
  ): { lat: number; lon: number }[] => {
    const path: { lat: number; lon: number }[] = [];

    if (startIdx === endIdx) {
      return [courseTrack[startIdx]];
    }

    // Check which direction is shorter (forward or backward/wrap-around)
    const forwardDist =
      endIdx >= startIdx
        ? endIdx - startIdx
        : courseTrack.length - startIdx + endIdx;
    const backwardDist =
      startIdx >= endIdx
        ? startIdx - endIdx
        : courseTrack.length - endIdx + startIdx;

    // Go the shorter direction
    if (forwardDist <= backwardDist) {
      // Forward direction
      let idx = startIdx;
      while (idx !== endIdx) {
        path.push(courseTrack[idx]);
        idx = (idx + 1) % courseTrack.length;
      }
      path.push(courseTrack[endIdx]);
    } else {
      // Backward direction
      let idx = startIdx;
      while (idx !== endIdx) {
        path.push(courseTrack[idx]);
        idx = idx === 0 ? courseTrack.length - 1 : idx - 1;
      }
      path.push(courseTrack[endIdx]);
    }

    return path;
  };

  // Animate runner along course path
  useEffect(() => {
    if (courseTrack.length === 0) return;

    const targetPos: [number, number] = [runner.lat, runner.lon];
    const prevPos = prevPositionRef.current;

    // First render - just set position
    if (!prevPos) {
      setDisplayPosition(targetPos);
      prevPositionRef.current = targetPos;
      return;
    }

    // Calculate distance to determine if this is a large jump (lap completion)
    const distance = calculateDistance(
      prevPos[0],
      prevPos[1],
      targetPos[0],
      targetPos[1]
    );

    // If large jump (>100m), instantly update without animation
    if (distance > 100) {
      setDisplayPosition(targetPos);
      prevPositionRef.current = targetPos;
      return;
    }

    // Find nearest points on track for both positions
    const startIdx = findNearestPointOnTrack(prevPos[0], prevPos[1]);
    const endIdx = findNearestPointOnTrack(targetPos[0], targetPos[1]);

    // Get path along track
    const path = getPathAlongTrack(startIdx, endIdx);

    // If path is too short, just move directly
    if (path.length < 2) {
      setDisplayPosition(targetPos);
      prevPositionRef.current = targetPos;
      return;
    }

    // Animate along the path over 10 seconds
    const duration = 10000; // 10 seconds to match refresh interval
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate position along path
      const totalSegments = path.length - 1;
      const segmentProgress = progress * totalSegments;
      const currentSegment = Math.floor(segmentProgress);
      const segmentFraction = segmentProgress - currentSegment;

      if (currentSegment >= totalSegments) {
        // Animation complete
        setDisplayPosition(targetPos);
        prevPositionRef.current = targetPos;
        return;
      }

      // Interpolate between current segment points
      const p1 = path[currentSegment];
      const p2 = path[currentSegment + 1];
      const lat = p1.lat + (p2.lat - p1.lat) * segmentFraction;
      const lon = p1.lon + (p2.lon - p1.lon) * segmentFraction;

      setDisplayPosition([lat, lon]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevPositionRef.current = targetPos;
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [runner.lat, runner.lon, courseTrack]);

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

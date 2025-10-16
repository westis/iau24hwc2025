// lib/hooks/useRaceClock.ts
"use client";

import { useState, useEffect } from "react";
import type { RaceState } from "@/types/live-race";

export interface RaceClockData {
  raceState: RaceState;
  startTime: Date;
  endTime: Date;
  elapsedSeconds: number;
  remainingSeconds: number;
  countdownSeconds: number;
}

export function useRaceClock(startDate: string, endDate?: string | null) {
  const [clockData, setClockData] = useState<RaceClockData | null>(null);

  useEffect(() => {
    const start = new Date(startDate);
    const end = endDate
      ? new Date(endDate)
      : new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const updateClock = () => {
      const now = new Date();
      const elapsedMs = now.getTime() - start.getTime();
      const totalDurationMs = end.getTime() - start.getTime();
      const remainingMs = end.getTime() - now.getTime();
      const countdownMs = start.getTime() - now.getTime();

      let raceState: RaceState;
      if (now < start) {
        raceState = "not_started";
      } else if (now > end) {
        raceState = "finished";
      } else {
        raceState = "live";
      }

      setClockData({
        raceState,
        startTime: start,
        endTime: end,
        elapsedSeconds: Math.max(0, Math.floor(elapsedMs / 1000)),
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
        countdownSeconds: Math.max(0, Math.floor(countdownMs / 1000)),
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return clockData;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatCountdown(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

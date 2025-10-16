"use client";

import { useState, useEffect } from "react";
import {
  useRaceClock,
  formatTime,
  formatCountdown,
} from "@/lib/hooks/useRaceClock";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { RaceInfo } from "@/types/race";

interface RaceClockProps {
  race: RaceInfo;
}

export function RaceClock({ race }: RaceClockProps) {
  const clockData = useRaceClock(race.startDate, race.endDate);
  const { t } = useLanguage();
  const [simulationConfig, setSimulationConfig] = useState<{
    simulationMode: boolean;
    currentRaceTimeSec: number;
    simulationStartTime?: string;
    fetchedAt?: number; // When we fetched this value
  } | null>(null);
  const [clientTime, setClientTime] = useState(Date.now());

  // Fetch simulation config
  useEffect(() => {
    async function fetchSimulationConfig() {
      try {
        const res = await fetch("/api/race/config");
        const data = await res.json();
        if (data.simulation_mode) {
          setSimulationConfig({
            simulationMode: data.simulation_mode,
            currentRaceTimeSec: data.current_race_time_sec || 0,
            simulationStartTime: data.simulation_start_time,
            fetchedAt: Date.now(), // Record when we fetched this
          });
        } else {
          setSimulationConfig(null);
        }
      } catch (err) {
        console.error("Failed to fetch simulation config:", err);
      }
    }

    fetchSimulationConfig();
    const interval = setInterval(fetchSimulationConfig, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Client-side ticker for smooth clock updates (every second)
  useEffect(() => {
    const ticker = setInterval(() => {
      setClientTime(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  if (!clockData) {
    return <div className="animate-pulse h-16 bg-muted rounded-lg" />;
  }

  const { raceState, elapsedSeconds, remainingSeconds, countdownSeconds } =
    clockData;

  // Calculate simulation time with client-side ticking
  let displayElapsedSeconds = elapsedSeconds;
  let displayRemainingSeconds = remainingSeconds;

  if (
    simulationConfig?.simulationMode &&
    simulationConfig.simulationStartTime
  ) {
    // Calculate time since simulation started (just like real race!)
    const simulationStartMs = new Date(
      simulationConfig.simulationStartTime
    ).getTime();
    const elapsedMs = clientTime - simulationStartMs;
    displayElapsedSeconds = Math.floor(elapsedMs / 1000);
    displayRemainingSeconds = Math.max(0, 86400 - displayElapsedSeconds);
  }

  // Override race state if in simulation mode
  const effectiveRaceState = simulationConfig?.simulationMode
    ? "live"
    : raceState;

  return (
    <div className="text-right">
      {effectiveRaceState === "not_started" && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t.live?.startsIn || "Startar om"}
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono">
            {formatCountdown(countdownSeconds)}
          </div>
        </div>
      )}

      {effectiveRaceState === "live" && (
        <div>
          <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mb-1">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <span>{t.live?.elapsedTime || "Förfluten tid"}</span>
            {simulationConfig && (
              <span className="text-orange-500 ml-1">(SIM)</span>
            )}
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-primary">
            {formatTime(displayElapsedSeconds)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatTime(displayRemainingSeconds)} {t.live?.remaining || "kvar"}
          </div>
        </div>
      )}

      {effectiveRaceState === "finished" && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t.live?.raceFinished || "Loppet avslutat"}
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono">
            24:00:00
          </div>
        </div>
      )}
    </div>
  );
}

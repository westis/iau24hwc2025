"use client";

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

  if (!clockData) {
    return <div className="animate-pulse h-16 bg-muted rounded-lg" />;
  }

  const { raceState, elapsedSeconds, remainingSeconds, countdownSeconds } =
    clockData;

  return (
    <div className="text-right">
      {raceState === "not_started" && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t.live?.startsIn || "Startar om"}
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono">
            {formatCountdown(countdownSeconds)}
          </div>
        </div>
      )}

      {raceState === "live" && (
        <div>
          <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mb-1">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <span>{t.live?.elapsedTime || "Förfluten tid"}</span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-primary">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatTime(remainingSeconds)} {t.live?.remaining || "kvar"}
          </div>
        </div>
      )}

      {raceState === "finished" && (
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

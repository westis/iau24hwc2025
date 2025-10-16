"use client";

import { useState, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, AlertCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NextLapPrediction } from "@/types/live-race";

interface CountdownCardProps {
  prediction: NextLapPrediction;
  crewSpotOffset: number; // meters
}

function formatTime(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = Math.floor(absSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function CountdownCard({
  prediction,
  crewSpotOffset,
}: CountdownCardProps) {
  const { t } = useLanguage();

  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s ${t.live?.ago || "ago"}`;
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)}m ${t.live?.ago || "ago"}`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m ${t.live?.ago || "ago"}`;
  };
  const [timeSinceLastPassing, setTimeSinceLastPassing] = useState(
    prediction.timeSinceLastPassing
  );

  // Update time since last passing every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceLastPassing((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate current countdown times (accounting for elapsed time since data fetch)
  const additionalElapsed =
    timeSinceLastPassing - prediction.timeSinceLastPassing;
  const currentTimeUntilTimingMat =
    prediction.timeUntilTimingMat - additionalElapsed;
  const currentTimeUntilCrewSpot =
    prediction.timeUntilCrewSpot - additionalElapsed;

  const isOverdueTimingMat = currentTimeUntilTimingMat < 0;
  const isOverdueCrewSpot = currentTimeUntilCrewSpot < 0;

  // Calculate progress percentage (0-100)
  const progressPercent = Math.min(
    100,
    Math.max(0, (timeSinceLastPassing / prediction.predictedLapTime) * 100)
  );

  // Determine card background color based on time until timing mat
  const getCardColorClass = () => {
    if (isOverdueTimingMat)
      return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
    if (currentTimeUntilTimingMat <= 60)
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"; // <= 1 minute
    if (currentTimeUntilTimingMat <= 120)
      return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"; // <= 2 minutes
    return "";
  };

  // Determine confidence level
  const confidenceLevel =
    prediction.confidence >= 0.8
      ? "high"
      : prediction.confidence >= 0.5
      ? "medium"
      : "low";

  const confidenceColor =
    confidenceLevel === "high"
      ? "text-green-500"
      : confidenceLevel === "medium"
      ? "text-yellow-500"
      : "text-orange-500";

  return (
    <Card className={`hover:shadow-md transition-all ${getCardColorClass()}`}>
      <CardContent className="p-3">
        {/* Header Row - Compact */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-sm font-bold text-muted-foreground shrink-0">
              #{prediction.bib}
            </div>
            <ReactCountryFlag
              countryCode={getCountryCodeForFlag(prediction.country)}
              svg
              style={{ width: "1.2em", height: "0.8em" }}
              className="shrink-0"
            />
            <div className="font-semibold text-sm truncate">
              {prediction.name}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 shrink-0">
                  {confidenceLevel === "low" && (
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  )}
                  <TrendingUp className={`h-3 w-3 ${confidenceColor}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t.live?.confidence || "Confidence"}:{" "}
                  {(prediction.confidence * 100).toFixed(0)}%
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Progress Bar - Compact */}
        <div className="mb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Timing Mat Countdown - Compact */}
        <div className="flex items-center justify-between py-1.5 px-2 bg-primary/10 rounded mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">
              {t.live?.timingMat || "Mat"}
            </span>
          </div>
          <div
            className={`text-lg font-bold tabular-nums ${
              isOverdueTimingMat ? "text-red-500" : "text-primary"
            }`}
          >
            {isOverdueTimingMat && "+"}
            {formatTime(currentTimeUntilTimingMat)}
          </div>
        </div>

        {/* Crew Spot Countdown - Compact */}
        <div className="flex items-center justify-between py-1.5 px-2 bg-secondary/50 rounded mb-1.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-secondary-foreground" />
            <span className="text-xs font-medium">
              {t.live?.crewSpot || "Crew"} ({crewSpotOffset > 0 ? "+" : ""}
              {crewSpotOffset}m)
            </span>
          </div>
          <div
            className={`text-base font-bold tabular-nums ${
              isOverdueCrewSpot ? "text-red-500" : "text-secondary-foreground"
            }`}
          >
            {isOverdueCrewSpot && "+"}
            {formatTime(currentTimeUntilCrewSpot)}
          </div>
        </div>

        {/* Footer Info - Compact */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{formatTimeAgo(timeSinceLastPassing)}</span>
          <span>~{formatTime(prediction.predictedLapTime)}</span>
        </div>

        {/* Overdue Warning - Compact */}
        {(isOverdueTimingMat || isOverdueCrewSpot) && (
          <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-950 px-2 py-1 rounded mt-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{t.live?.overdue || "Overdue"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

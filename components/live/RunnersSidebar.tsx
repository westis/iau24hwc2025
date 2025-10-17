"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Coffee, Navigation, Clock } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { RunnerPosition } from "@/types/live-race";
import { getMarkerColor, getTextColor } from "@/lib/utils/runner-marker-colors";

interface RunnersSidebarProps {
  runnersOnTrack: RunnerPosition[];
  runnersOnBreak: RunnerPosition[];
  isTop6Mode?: boolean;
  sortByOverallRank?: boolean; // Sort by overall rank instead of gender rank
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function RunnerItem({
  runner,
  showOverdue,
  isTop6Mode = false,
}: {
  runner: RunnerPosition;
  showOverdue?: boolean;
  isTop6Mode?: boolean;
}) {
  const markerColor = getMarkerColor(runner.genderRank, runner.status, runner.gender, isTop6Mode);
  const textColor = getTextColor(runner.genderRank, runner.status, runner.gender, isTop6Mode);

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-muted">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="font-mono text-xs font-bold shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: markerColor,
            color: textColor,
            borderRadius: "50%",
            width: "28px",
            height: "28px",
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          {runner.bib}
        </div>
        <ReactCountryFlag
          countryCode={getCountryCodeForFlag(runner.country)}
          svg
          style={{ width: "1.2em", height: "0.8em" }}
          className="shrink-0"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{runner.name}</span>
          <span className="text-xs text-muted-foreground">
            {runner.gender === "m" ? "M" : "W"}
            {runner.genderRank} • {runner.distanceKm.toFixed(2)} km
          </span>
        </div>
      </div>
      {showOverdue && runner.timeOverdue && (
        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 shrink-0">
          <Clock className="h-3 w-3" />
          <span className="text-xs font-medium">
            +{formatDuration(runner.timeOverdue)}
          </span>
        </div>
      )}
    </div>
  );
}

export function RunnersSidebar({
  runnersOnTrack,
  runnersOnBreak,
  isTop6Mode = false,
  sortByOverallRank = false,
}: RunnersSidebarProps) {
  const { t } = useLanguage();

  // Sort runners - use overall rank when showing all genders together
  const sortField = sortByOverallRank ? "rank" : "genderRank";
  const sortedOnTrack = [...runnersOnTrack].sort(
    (a, b) => a[sortField] - b[sortField]
  );
  const sortedOnBreak = [...runnersOnBreak].sort(
    (a, b) => a[sortField] - b[sortField]
  );

  return (
    <div className="space-y-4">
      {/* On Track Section */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            {t.live?.onCourse || "On Track"} ({sortedOnTrack.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {sortedOnTrack.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.live?.noRunnersOnTrack || "No runners on track"}
            </p>
          ) : (
            sortedOnTrack.map((runner) => (
              <RunnerItem
                key={runner.bib}
                runner={runner}
                showOverdue={runner.status === "overdue"}
                isTop6Mode={isTop6Mode}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* On Break Section */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            {t.live?.onBreak || "On Break"} ({sortedOnBreak.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
          {sortedOnBreak.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.live?.noRunnersOnBreak || "All runners are on the course"}
            </p>
          ) : (
            sortedOnBreak.map((runner) => (
              <RunnerItem key={runner.bib} runner={runner} showOverdue={true} isTop6Mode={isTop6Mode} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

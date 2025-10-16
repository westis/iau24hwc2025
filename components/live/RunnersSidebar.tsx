"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Coffee, Navigation, Clock } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { RunnerPosition } from "@/types/live-race";

interface RunnersSidebarProps {
  runnersOnTrack: RunnerPosition[];
  runnersOnBreak: RunnerPosition[];
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

function RunnerItem({ runner, showOverdue }: { runner: RunnerPosition; showOverdue?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-muted">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="font-mono text-sm font-bold text-muted-foreground shrink-0">
          #{runner.bib}
        </div>
        <ReactCountryFlag
          countryCode={getCountryCodeForFlag(runner.country)}
          svg
          style={{ width: "1.2em", height: "0.8em" }}
          className="shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">
            {runner.name}
          </span>
          <span className="text-xs text-muted-foreground">
            P{runner.rank} • {runner.gender === "m" ? "M" : "W"}{runner.genderRank}
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

export function RunnersSidebar({ runnersOnTrack, runnersOnBreak }: RunnersSidebarProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* On Track Section */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            {t.live?.onCourse || "On Track"} ({runnersOnTrack.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {runnersOnTrack.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.live?.noRunnersOnTrack || "No runners on track"}
            </p>
          ) : (
            runnersOnTrack.map((runner) => (
              <RunnerItem 
                key={runner.bib} 
                runner={runner}
                showOverdue={runner.status === "overdue"}
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
            {t.live?.onBreak || "On Break"} ({runnersOnBreak.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
          {runnersOnBreak.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.live?.noRunnersOnBreak || "All runners are on the course"}
            </p>
          ) : (
            runnersOnBreak.map((runner) => (
              <RunnerItem 
                key={runner.bib} 
                runner={runner}
                showOverdue={true}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


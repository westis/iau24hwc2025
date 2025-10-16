"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPace,
  formatLapTime,
  formatTimeHMS,
} from "@/lib/live-race/calculations";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { getCountryNameI18n } from "@/lib/utils/country-names-i18n";
import type { LeaderboardEntry, LapTime } from "@/types/live-race";
import ReactCountryFlag from "react-country-flag";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  onToggleWatchlist: (bib: number) => void;
  isInWatchlist: (bib: number) => boolean;
  showGenderRank?: boolean;
}

export function LeaderboardTable({
  entries,
  onToggleWatchlist,
  isInWatchlist,
  showGenderRank = false,
}: LeaderboardTableProps) {
  const [expandedBib, setExpandedBib] = useState<number | null>(null);
  const [lapData, setLapData] = useState<{ [bib: number]: LapTime[] }>({});
  const [loadingLaps, setLoadingLaps] = useState<number | null>(null);
  const { t, language } = useLanguage();

  const fetchLapData = async (bib: number) => {
    setLoadingLaps(bib);
    try {
      const res = await fetch(`/api/race/laps/${bib}?_t=${Date.now()}`);
      const data = await res.json();
      setLapData((prev) => ({ ...prev, [bib]: data.laps }));
    } catch (err) {
      console.error("Failed to fetch lap data:", err);
    } finally {
      setLoadingLaps(null);
    }
  };

  const toggleExpand = async (bib: number) => {
    if (expandedBib === bib) {
      setExpandedBib(null);
      return;
    }

    setExpandedBib(bib);

    // Fetch lap data immediately
    if (!lapData[bib]) {
      await fetchLapData(bib);
    }
  };

  // Auto-refresh lap data for expanded runner
  useEffect(() => {
    if (expandedBib === null) return;

    // Refresh immediately
    fetchLapData(expandedBib);

    // Then poll every 30 seconds for new laps (optimized for free tier)
    const interval = setInterval(() => {
      fetchLapData(expandedBib);
    }, 30000);

    return () => clearInterval(interval);
  }, [expandedBib]);

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    if (trend === "up")
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.live?.noRunnersFound || "Inga löpare hittades"}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 px-0.5 sm:px-2"></TableHead>
            <TableHead className="w-12 px-1 sm:px-2">
              {t.live?.rank || "Plac."}
            </TableHead>
            <TableHead className="w-12 px-1 sm:px-2">
              {t.live?.bib || "Nr"}
            </TableHead>
            <TableHead className="px-2">{t.live?.runner || "Löpare"}</TableHead>
            <TableHead className="text-right px-2">
              {t.live?.distance || "Distans"}
            </TableHead>
            <TableHead className="text-right px-2 hidden md:table-cell">
              {t.live?.projected || "Prognos"}
            </TableHead>
            <TableHead className="text-right px-2 hidden xl:table-cell">
              {t.live?.lastPassing || "Sen. pass."}
            </TableHead>
            <TableHead className="text-right px-2 hidden sm:table-cell">
              {t.live?.lastLap || "Varv"}
            </TableHead>
            <TableHead className="text-right px-2 hidden lg:table-cell">
              {t.live?.lapPace || "Lap Pace"}
            </TableHead>
            <TableHead className="w-8 px-2 hidden sm:table-cell"></TableHead>
            <TableHead className="w-8 px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <React.Fragment key={entry.bib}>
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(entry.bib)}
              >
                <TableCell className="px-0.5 sm:px-2 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(entry.bib);
                    }}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        isInWatchlist(entry.bib)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </TableCell>
                <TableCell className="font-medium px-1 sm:px-2 py-2">
                  {showGenderRank ? entry.genderRank : entry.rank}
                </TableCell>
                <TableCell className="font-mono px-1 sm:px-2 py-2 text-sm">
                  {entry.bib}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            <ReactCountryFlag
                              countryCode={getCountryCodeForFlag(entry.country)}
                              svg
                              style={{ width: "1.2em", height: "1.2em" }}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {getCountryNameI18n(
                              entry.country,
                              language as "en" | "sv"
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-medium text-sm">{entry.name}</span>
                    {!showGenderRank && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.gender === "m"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                        }`}
                      >
                        {entry.gender === "m" ? "M" : "W"}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono px-2 py-2 text-sm">
                  {entry.distanceKm.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono hidden md:table-cell text-muted-foreground px-2 py-2 text-sm">
                  {entry.projectedKm.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono hidden xl:table-cell px-2 py-2 text-sm text-muted-foreground">
                  {entry.lastPassing
                    ? new Date(entry.lastPassing).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-mono px-2 py-2 hidden sm:table-cell text-sm">
                  {formatLapTime(entry.lapTimeSec)}
                </TableCell>
                <TableCell className="text-right font-mono hidden lg:table-cell px-2 py-2 text-sm">
                  {formatPace(entry.lapPaceSec)}
                </TableCell>
                <TableCell className="hidden sm:table-cell px-2 py-2">
                  {getTrendIcon(entry.trend)}
                </TableCell>
                <TableCell className="px-2 py-2">
                  {expandedBib === entry.bib ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </TableCell>
              </TableRow>

              {/* Expanded lap details */}
              {expandedBib === entry.bib && (
                <TableRow>
                  <TableCell colSpan={11} className="bg-muted/30 p-4">
                    {/* Hidden column info for narrow screens */}
                    <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="sm:hidden">
                        <div className="text-muted-foreground text-xs">
                          {t.live?.lastLap || "Senaste varv"}
                        </div>
                        <div className="font-mono">
                          {formatLapTime(entry.lapTimeSec)}
                        </div>
                      </div>
                      <div className="lg:hidden">
                        <div className="text-muted-foreground text-xs">
                          {t.live?.lapPace || "Lap Pace"}
                        </div>
                        <div className="font-mono">
                          {formatPace(entry.lapPaceSec)}
                        </div>
                      </div>
                      <div className="md:hidden">
                        <div className="text-muted-foreground text-xs">
                          {t.live?.projected || "Prognos"}
                        </div>
                        <div className="font-mono">
                          {entry.projectedKm.toFixed(2)} km
                        </div>
                      </div>
                      <div className="xl:hidden">
                        <div className="text-muted-foreground text-xs">
                          {t.live?.lastPassing || "Senaste passering"}
                        </div>
                        <div className="font-mono">
                          {entry.lastPassing
                            ? new Date(entry.lastPassing).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {loadingLaps === entry.bib ? (
                      <div className="text-center py-4">
                        {t.live?.loadingLaps || "Laddar varv..."}
                      </div>
                    ) : lapData[entry.bib] ? (
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.live?.lap || "Varv"}</TableHead>
                              <TableHead className="text-right">
                                {t.live?.raceTime || "Lopptid"}
                              </TableHead>
                              <TableHead className="text-right">
                                {t.live?.lapTime || "Varvtid"}
                              </TableHead>
                              <TableHead className="text-right">
                                {t.live?.distance || "Distans"}
                              </TableHead>
                              <TableHead className="text-right">
                                {t.live?.lapPace || "Lap Pace"}
                              </TableHead>
                              <TableHead className="text-right">
                                {t.live?.avgPace || "Snittempo"}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lapData[entry.bib]
                              .slice()
                              .reverse()
                              .map((lap) => (
                                <TableRow key={lap.lap}>
                                  <TableCell>{lap.lap}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatTimeHMS(lap.raceTimeSec)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatLapTime(lap.lapTimeSec)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {lap.distanceKm.toFixed(2)} km
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatPace(lap.lapPace)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatPace(lap.avgPace)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No lap data available
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

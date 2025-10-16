"use client";

import { useState, useEffect } from "react";
import { RaceClock } from "@/components/live/RaceClock";
import { DistancePaceChart } from "@/components/live/DistancePaceChart";
import { GapAnalysisChart } from "@/components/live/GapAnalysisChart";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/PageTitle";
import type { RaceInfo } from "@/types/race";

// Empty array outside component to avoid recreating on every render
const EMPTY_ARRAY: number[] = [];

export default function ChartsPage() {
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [selectedBibs, setSelectedBibs] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<
    "top6" | "watchlist" | "custom"
  >("top6");
  const [top6Gender, setTop6Gender] = useState<"men" | "women">("men");
  const [simulationMode, setSimulationMode] = useState(false);
  const [showCustomSelection, setShowCustomSelection] = useState(false);

  const { watchlist } = useWatchlist();
  
  // Fetch leaderboard based on top6 gender selection
  const leaderboardFilter = selectionMode === "top6" ? top6Gender : "overall";
  const { data: leaderboardData } = useLeaderboard(
    leaderboardFilter,
    EMPTY_ARRAY,
    60000
  );
  const { t } = useLanguage();

  // Fetch race info and simulation config
  useEffect(() => {
    async function fetchRaceInfo() {
      try {
        const res = await fetch("/api/race");
        const data = await res.json();
        setRaceInfo(data);
      } catch (err) {
        console.error("Failed to fetch race info:", err);
      } finally {
        setLoadingRace(false);
      }
    }

    async function fetchSimulationConfig() {
      try {
        const res = await fetch("/api/race/config");
        const data = await res.json();
        setSimulationMode(data.simulation_mode || false);
      } catch (err) {
        console.error("Failed to fetch simulation config:", err);
      }
    }

    fetchRaceInfo();
    fetchSimulationConfig();

    const interval = setInterval(fetchSimulationConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update selected bibs based on mode
  useEffect(() => {
    if (!leaderboardData?.entries) return;

    if (selectionMode === "top6") {
      const top6 = leaderboardData.entries.slice(0, 6).map((e) => e.bib);
      // Only update if bibs actually changed
      setSelectedBibs((prev) => {
        if (
          prev.length === top6.length &&
          prev.every((bib, i) => bib === top6[i])
        ) {
          return prev;
        }
        return top6;
      });
    } else if (selectionMode === "watchlist") {
      // Only update if watchlist changed
      setSelectedBibs((prev) => {
        if (
          prev.length === watchlist.length &&
          prev.every((bib) => watchlist.includes(bib))
        ) {
          return prev;
        }
        return watchlist;
      });
    }
  }, [selectionMode, leaderboardData?.entries, watchlist]);

  const toggleBib = (bib: number) => {
    if (selectionMode !== "custom") {
      setSelectionMode("custom");
      setShowCustomSelection(true);
    }
    setSelectedBibs((prev) =>
      prev.includes(bib) ? prev.filter((b) => b !== bib) : [...prev, bib]
    );
  };

  // Debug logging
  useEffect(() => {
    console.log("Selected bibs for charts:", selectedBibs);
  }, [selectedBibs]);

  if (loadingRace || !raceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {t.live?.loading || "Laddar..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle title={`${t.live?.charts || "Charts"} | ${t.live?.title || "Live"}`} />
      <div className="min-h-screen bg-background">
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-4 px-4 space-y-4">
        {/* Compact Header: Race Clock + Runner Selection */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border rounded-lg p-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                {t.live?.runnerSelection || "Välj löpare"}:
              </span>
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  size="sm"
                  variant={selectionMode === "top6" ? "default" : "outline"}
                  onClick={() => setSelectionMode("top6")}
                >
                  {t.live?.top6Overall || "Topp 6"}
                </Button>
                
                {/* Gender selector for Top 6 */}
                {selectionMode === "top6" && (
                  <div className="flex gap-1 border rounded-md">
                    <Button
                      size="sm"
                      variant={top6Gender === "men" ? "default" : "ghost"}
                      onClick={() => setTop6Gender("men")}
                      className="rounded-r-none"
                    >
                      {t.common?.men || "Herrar"}
                    </Button>
                    <Button
                      size="sm"
                      variant={top6Gender === "women" ? "default" : "ghost"}
                      onClick={() => setTop6Gender("women")}
                      className="rounded-l-none"
                    >
                      {t.common?.women || "Damer"}
                    </Button>
                  </div>
                )}
                
                <Button
                  size="sm"
                  variant={
                    selectionMode === "watchlist" ? "default" : "outline"
                  }
                  onClick={() => setSelectionMode("watchlist")}
                  disabled={watchlist.length === 0}
                >
                  ⭐ {watchlist.length}
                </Button>
                <Button
                  size="sm"
                  variant={selectionMode === "custom" ? "default" : "outline"}
                  onClick={() => {
                    setSelectionMode("custom");
                    setShowCustomSelection(true);
                  }}
                >
                  {t.live?.custom || "Anpassad"}
                </Button>
                {selectionMode === "custom" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCustomSelection(!showCustomSelection)}
                  >
                    {showCustomSelection ? "▼" : "▶"}
                  </Button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                ({selectedBibs.length} {t.live?.runners || "löpare"})
              </span>
            </div>

            {selectionMode === "custom" &&
              showCustomSelection &&
              leaderboardData && (
                <div className="mt-3 border rounded-lg p-3 max-h-48 overflow-y-auto bg-muted/20">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {leaderboardData.entries.map((entry) => (
                      <div key={entry.bib} className="flex items-center gap-2">
                        <Checkbox
                          id={`runner-${entry.bib}`}
                          checked={selectedBibs.includes(entry.bib)}
                          onCheckedChange={() => toggleBib(entry.bib)}
                        />
                        <Label
                          htmlFor={`runner-${entry.bib}`}
                          className="text-xs cursor-pointer truncate"
                          title={`#${entry.bib} ${entry.name}`}
                        >
                          #{entry.bib} {entry.name.split(" ")[0]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <RaceClock race={raceInfo} />
        </div>

        {/* Chart Tabs */}
        <Tabs defaultValue="distance-pace" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="distance-pace">
              {t.live?.distanceAndPace || "Distance & Pace"}
            </TabsTrigger>
            <TabsTrigger value="gap-analysis">
              {t.live?.gapAnalysis || "Gap Analysis"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distance-pace" className="mt-6">
            <DistancePaceChart bibs={selectedBibs} />
          </TabsContent>

          <TabsContent value="gap-analysis" className="mt-6">
            <GapAnalysisChart bibs={selectedBibs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}

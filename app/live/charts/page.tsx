"use client";

import { useState, useEffect } from "react";
import { RaceClock } from "@/components/live/RaceClock";
import { DistanceChart } from "@/components/live/DistanceChart";
import { LiveNavigation } from "@/components/live/LiveNavigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { RaceInfo } from "@/types/race";

export default function ChartsPage() {
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [selectedBibs, setSelectedBibs] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<
    "top6" | "watchlist" | "custom"
  >("top6");

  const { watchlist } = useWatchlist();
  const { data: leaderboardData } = useLeaderboard("overall", [], 60000);
  const { t } = useLanguage();

  // Fetch race info
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
    fetchRaceInfo();
  }, []);

  // Update selected bibs based on mode
  useEffect(() => {
    if (!leaderboardData?.entries) return;

    if (selectionMode === "top6") {
      const top6 = leaderboardData.entries.slice(0, 6).map((e) => e.bib);
      setSelectedBibs(top6);
    } else if (selectionMode === "watchlist") {
      setSelectedBibs(watchlist);
    }
  }, [selectionMode, leaderboardData, watchlist]);

  const toggleBib = (bib: number) => {
    if (selectionMode !== "custom") {
      setSelectionMode("custom");
    }
    setSelectedBibs((prev) =>
      prev.includes(bib) ? prev.filter((b) => b !== bib) : [...prev, bib]
    );
  };

  if (loadingRace || !raceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.live?.loading || "Laddar..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LiveNavigation />
      <div className="container mx-auto py-4 px-4 space-y-6">
        {/* Race Clock */}
        <RaceClock race={raceInfo} />

        {/* Runner Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t.live?.runnerSelection || "Välj löpare"}</CardTitle>
            <CardDescription>
              {t.live?.runnerSelectionDesc || "Välj vilka löpare som ska visas i diagrammen"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectionMode === "top6" ? "default" : "outline"}
                  onClick={() => setSelectionMode("top6")}
                >
                  {t.live?.top6Overall || "Topp 6 totalt"}
                </Button>
                <Button
                  variant={
                    selectionMode === "watchlist" ? "default" : "outline"
                  }
                  onClick={() => setSelectionMode("watchlist")}
                  disabled={watchlist.length === 0}
                >
                  {t.live?.watchlist || "Favoritlista"} ({watchlist.length})
                </Button>
                <Button
                  variant={selectionMode === "custom" ? "default" : "outline"}
                  onClick={() => setSelectionMode("custom")}
                >
                  {t.live?.custom || "Anpassad"}
                </Button>
              </div>

              {selectionMode === "custom" && leaderboardData && (
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {leaderboardData.entries.map((entry) => (
                      <div key={entry.bib} className="flex items-center gap-2">
                        <Checkbox
                          id={`runner-${entry.bib}`}
                          checked={selectedBibs.includes(entry.bib)}
                          onCheckedChange={() => toggleBib(entry.bib)}
                        />
                        <Label
                          htmlFor={`runner-${entry.bib}`}
                          className="text-sm cursor-pointer"
                        >
                          #{entry.bib} {entry.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Selected: {selectedBibs.length} runner(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distance Chart */}
        <DistanceChart bibs={selectedBibs} />

        {/* Pace Analysis Chart - Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Pace Analysis</CardTitle>
            <CardDescription>
              Rolling pace and forecast (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
            Pace analysis chart will be added here
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

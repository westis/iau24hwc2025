"use client";

import { useState, useEffect, Suspense } from "react";
import { RaceClock } from "@/components/live/RaceClock";
import { DistancePaceChart } from "@/components/live/DistancePaceChart";
import { GapAnalysisChart } from "@/components/live/GapAnalysisChart";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { OfficialTimingBanner } from "@/components/live/OfficialTimingBanner";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useLiveFilters } from "@/lib/hooks/useLiveFilters";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/PageTitle";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import type { RaceInfo } from "@/types/race";
import type { LeaderboardEntry } from "@/types/live-race";

function ChartsContent() {
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [selectedBibs, setSelectedBibs] = useState<number[]>([]);
  const [simulationMode, setSimulationMode] = useState(false);
  const [showCustomSelection, setShowCustomSelection] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  const { watchlist } = useWatchlist();
  const { t } = useLanguage();

  // Use persistent filters hook
  const { filters, setFilter, updateFilters } = useLiveFilters("charts", {
    mode: "top6",
    gender: "m",
    country: "",
  });

  const selectionMode = filters.mode as "top6" | "watchlist" | "country" | "custom";
  const selectedGender = filters.gender as "m" | "w" | "all";
  const selectedCountry = filters.country || "";

  // Helper to switch modes and clear irrelevant filters
  const switchMode = (newMode: string) => {
    const updates: Record<string, string> = { mode: newMode };

    // Clear country when not in country mode
    if (newMode !== "country") {
      updates.country = "";
    }

    updateFilters(updates);
  };

  // Fetch all countries from registered runners
  const fetchCountries = async () => {
    try {
      const res = await fetch("/api/runners/countries");
      if (res.ok) {
        const data = await res.json();
        setCountries(data.countries || []);
      }
    } catch (err) {
      console.error("Failed to fetch countries:", err);
    }
  };

  // Fetch leaderboard data based on selection mode
  const fetchLeaderboardData = async () => {
    try {
      // For watchlist mode, don't fetch leaderboard at all
      if (selectionMode === "watchlist") {
        return;
      }

      // For top6 mode, only fetch the specific gender
      if (selectionMode === "top6") {
        const genderFilter = selectedGender === "w" ? "women" : "men";
        const res = await fetch(`/api/race/leaderboard?filter=${genderFilter}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.entries && data.entries.length > 0) {
            setLeaderboardData(data);
          }
        }
        return;
      }

      // For country and custom modes, fetch overall
      if (selectionMode === "country" || selectionMode === "custom") {
        const res = await fetch("/api/race/leaderboard?filter=overall");
        if (res.ok) {
          const data = await res.json();
          if (data && data.entries && data.entries.length > 0) {
            setLeaderboardData(data);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

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
    fetchCountries();

    const configInterval = setInterval(fetchSimulationConfig, 10000);
    return () => {
      clearInterval(configInterval);
    };
  }, []);

  // Fetch leaderboard when selection mode or gender changes
  useEffect(() => {
    fetchLeaderboardData();

    const leaderboardInterval = setInterval(fetchLeaderboardData, 10000);
    return () => {
      clearInterval(leaderboardInterval);
    };
  }, [selectionMode, selectedGender]);

  // Calculate filtered bibs based on selection mode
  useEffect(() => {
    if (selectionMode === "watchlist") {
      const watchlistBibs = watchlist.length > 0 ? watchlist : [];
      setSelectedBibs((prev) => {
        // Prevent unnecessary updates if watchlist hasn't changed
        if (
          prev.length === watchlistBibs.length &&
          prev.every((bib, i) => bib === watchlistBibs[i])
        ) {
          return prev;
        }
        return watchlistBibs;
      });
      return;
    }

    if (!leaderboardData?.entries) return;

    if (selectionMode === "top6") {
      const top6 = leaderboardData.entries
        .slice(0, 6)
        .map((e: LeaderboardEntry) => e.bib);
      setSelectedBibs((prev) => {
        if (
          prev.length === top6.length &&
          prev.every((bib, i) => bib === top6[i])
        ) {
          return prev;
        }
        return top6;
      });
    } else if (selectionMode === "country" && selectedCountry) {
      const filtered = leaderboardData.entries
        .filter(
          (e: LeaderboardEntry) =>
            e.country === selectedCountry &&
            (selectedGender === "all" || e.gender === selectedGender)
        )
        .sort(
          (a: LeaderboardEntry, b: LeaderboardEntry) =>
            a.genderRank - b.genderRank
        )
        .slice(0, 10) // Limit to 10 runners for charts
        .map((e: LeaderboardEntry) => e.bib);
      setSelectedBibs((prev) => {
        // Prevent unnecessary updates if filtered bibs haven't changed
        if (
          prev.length === filtered.length &&
          prev.every((bib, i) => bib === filtered[i])
        ) {
          return prev;
        }
        return filtered;
      });
    }
  }, [selectionMode, leaderboardData?.entries, watchlist, selectedCountry, selectedGender]);

  const toggleBib = (bib: number) => {
    if (selectionMode !== "custom") {
      setFilter("mode", "custom");
      setShowCustomSelection(true);
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
          <p className="text-muted-foreground">
            {t.live?.loading || "Laddar..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle
        title={`${t.live?.charts || "Charts"} | ${t.live?.title || "Live"}`}
      />
      <div className="min-h-screen bg-background">
        <OfficialTimingBanner />
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-4 px-4 space-y-4">
          {/* Compact Header: Race Clock + Runner Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    {/* Selection Mode Buttons */}
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-sm font-medium mb-2 block">
                        {t.live?.runnerSelection || "Välj löpare"}
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={selectionMode === "top6" ? "default" : "outline"}
                          onClick={() => switchMode("top6")}
                        >
                          {t.live?.top6Overall || "Topp 6"}
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            selectionMode === "watchlist" ? "default" : "outline"
                          }
                          onClick={() => switchMode("watchlist")}
                          disabled={watchlist.length === 0}
                        >
                          ⭐ {watchlist.length}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectionMode === "country" ? "default" : "outline"}
                          onClick={() => switchMode("country")}
                        >
                          {t.runners?.country || "Land"}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectionMode === "custom" ? "default" : "outline"}
                          onClick={() => {
                            switchMode("custom");
                            setShowCustomSelection(true);
                          }}
                        >
                          {t.live?.custom || "Anpassad"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {selectedBibs.length} {t.live?.runners || "löpare"}
                      </div>
                    </div>

                    {/* Gender Selection (for Top 6 and Country) */}
                    {(selectionMode === "top6" || selectionMode === "country") && (
                      <div className="w-full sm:w-auto sm:min-w-[180px]">
                        <Label className="text-sm font-medium mb-2 block">
                          {t.common?.gender || "Kön"}
                        </Label>
                        <div className="flex gap-1 border rounded-md w-full sm:w-auto">
                          {selectionMode === "country" && (
                            <Button
                              size="sm"
                              variant={selectedGender === "all" ? "default" : "ghost"}
                              onClick={() => setFilter("gender", "all")}
                              className="flex-1 sm:flex-none"
                            >
                              {t.common?.all || "Alla"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={selectedGender === "m" ? "default" : "ghost"}
                            onClick={() => setFilter("gender", "m")}
                            className="flex-1 sm:flex-none"
                          >
                            {t.common?.men || "Herrar"}
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedGender === "w" ? "default" : "ghost"}
                            onClick={() => setFilter("gender", "w")}
                            className="flex-1 sm:flex-none"
                          >
                            {t.common?.women || "Damer"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Country Selection (only for Country mode) */}
                    {selectionMode === "country" && (
                      <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <Label className="text-sm font-medium mb-2 block">
                          {t.runners?.country || "Land"}
                        </Label>
                        <Select
                          value={selectedCountry}
                          onValueChange={(value) => {
                            setFilter("country", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t.live?.selectTeam || "Välj land"}
                            />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            {countries.map((country) => (
                              <SelectItem key={country} value={country}>
                                <div className="flex items-center gap-2">
                                  <ReactCountryFlag
                                    countryCode={getCountryCodeForFlag(country)}
                                    svg
                                    style={{ width: "1.5em", height: "1em" }}
                                  />
                                  {country}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Custom Selection Grid */}
                  {selectionMode === "custom" &&
                    showCustomSelection &&
                    leaderboardData && (
                      <div className="mt-3 border rounded-lg p-3 max-h-48 overflow-y-auto bg-muted/20">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          {leaderboardData.entries.map((entry: LeaderboardEntry) => (
                            <div
                              key={entry.bib}
                              className="flex items-center gap-2"
                            >
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

                {/* Race Clock */}
                <div className="flex-shrink-0">
                  <RaceClock race={raceInfo} />
                </div>
              </div>
            </CardContent>
          </Card>

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

export default function ChartsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Laddar...</p>
          </div>
        </div>
      }
    >
      <ChartsContent />
    </Suspense>
  );
}

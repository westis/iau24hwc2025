"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RaceClock } from "@/components/live/RaceClock";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { OfficialTimingBanner } from "@/components/live/OfficialTimingBanner";
import { PageTitle } from "@/components/PageTitle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useLiveFilters } from "@/lib/hooks/useLiveFilters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import type { RaceInfo } from "@/types/race";
import type { LeaderboardEntry } from "@/types/live-race";
import dynamic from "next/dynamic";

// Dynamically import RaceMap to avoid SSR issues with Leaflet
const RaceMap = dynamic(
  () =>
    import("@/components/live/RaceMap").then((mod) => ({
      default: mod.RaceMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
  }
);

function MapPageContent() {
  const { t } = useLanguage();
  const { watchlist } = useWatchlist();
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);

  // Use persistent filters hook
  const { filters, updateFilters, setFilter } = useLiveFilters("map", {
    mode: "top6",
    gender: "m",
    country: "",
  });

  const selectionMode = filters.mode as "top6" | "watchlist" | "country";
  const selectedGender = filters.gender as "m" | "w" | "all";
  const selectedCountry = filters.country || "";

  const [countries, setCountries] = useState<string[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

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

  // Fetch minimal leaderboard data based on selection mode
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
          setLeaderboardData(data);
        }
        return;
      }

      // For country mode, fetch overall (needed to filter by country)
      if (selectionMode === "country") {
        const res = await fetch("/api/race/leaderboard?filter=overall");
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

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

    // Poll for config updates every 10 seconds
    const configInterval = setInterval(fetchSimulationConfig, 10000);
    return () => {
      clearInterval(configInterval);
    };
  }, []);

  // Fetch leaderboard when selection mode or gender changes
  useEffect(() => {
    fetchLeaderboardData();

    // Poll for leaderboard updates every 10 seconds
    const leaderboardInterval = setInterval(fetchLeaderboardData, 10000);
    return () => {
      clearInterval(leaderboardInterval);
    };
  }, [selectionMode, selectedGender]);

  // Calculate filtered bibs based on selection mode (with limits to prevent overload)
  const getFilteredBibs = (): number[] | undefined => {
    // Watchlist mode: use watchlist bibs directly
    if (selectionMode === "watchlist") {
      return watchlist.length > 0 ? watchlist : undefined;
    }

    // Top 6 mode: max 6 runners (already filtered by gender on server)
    if (selectionMode === "top6" && leaderboardData) {
      const filtered = leaderboardData.entries
        .sort(
          (a: LeaderboardEntry, b: LeaderboardEntry) =>
            a.genderRank - b.genderRank
        )
        .slice(0, 6)
        .map((e: LeaderboardEntry) => e.bib);
      return filtered.length > 0 ? filtered : undefined;
    }

    // Country mode: max 15 runners to prevent overload
    if (selectionMode === "country" && selectedCountry && leaderboardData) {
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
        .slice(0, 15) // Limit to 15 runners max
        .map((e: LeaderboardEntry) => e.bib);
      return filtered.length > 0 ? filtered : undefined;
    }

    return undefined;
  };

  const filteredBibs = getFilteredBibs();

  if (loadingRace || !raceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle
        title={`${t.live?.map || "Map"} | ${t.live?.title || "Live"}`}
      />
      <div className="min-h-screen bg-background">
        <OfficialTimingBanner />
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-4 px-4 space-y-4">
          <RaceClock race={raceInfo} />

          {/* Runner Selection Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Selection Mode Tabs */}
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm font-medium mb-2 block">
                    {t.live?.runnerSelection || "Select Runners"}
                  </Label>
                  <Tabs
                    value={selectionMode}
                    onValueChange={(v) => {
                      setFilter("mode", v);
                    }}
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="top6" className="flex-1">
                        {t.live?.top6Overall || "Top 6"}
                      </TabsTrigger>
                      <TabsTrigger value="watchlist" className="flex-1">
                        {t.live?.watchlist || "Watchlist"}{" "}
                        {watchlist.length > 0 && `(${watchlist.length})`}
                      </TabsTrigger>
                      <TabsTrigger value="country" className="flex-1">
                        {t.runners?.country || "Country"}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Gender Selection (for Top 6 and Country) */}
                {selectionMode === "top6" && (
                  <div className="w-full sm:w-auto sm:min-w-[180px]">
                    <Label className="text-sm font-medium mb-2 block">
                      {t.common?.gender || "Gender"}
                    </Label>
                    <Tabs
                      value={selectedGender === "all" ? "m" : selectedGender}
                      onValueChange={(v) => {
                        setFilter("gender", v);
                      }}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="m" className="flex-1">
                          {t.common?.men || "Men"}
                        </TabsTrigger>
                        <TabsTrigger value="w" className="flex-1">
                          {t.common?.women || "Women"}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                {/* Gender Selection with "All" option for Country */}
                {selectionMode === "country" && (
                  <div className="w-full sm:w-auto sm:min-w-[200px]">
                    <Label className="text-sm font-medium mb-2 block">
                      {t.common?.gender || "Gender"}
                    </Label>
                    <Tabs
                      value={selectedGender}
                      onValueChange={(v) => {
                        setFilter("gender", v);
                      }}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="all" className="flex-1">
                          {t.common?.all || "All"}
                        </TabsTrigger>
                        <TabsTrigger value="m" className="flex-1">
                          {t.common?.men || "Men"}
                        </TabsTrigger>
                        <TabsTrigger value="w" className="flex-1">
                          {t.common?.women || "Women"}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                {/* Country Selection (only for Country mode) */}
                {selectionMode === "country" && (
                  <div className="w-full sm:w-auto sm:min-w-[200px]">
                    <Label className="text-sm font-medium mb-2 block">
                      {t.runners?.country || "Country"}
                    </Label>
                    <Select
                      value={selectedCountry}
                      onValueChange={(value) => {
                        setFilter("country", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t.live?.selectTeam || "Select a country"}
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

                {/* Empty state messages - shown below filters on mobile, inline on desktop */}
                {selectionMode === "watchlist" && watchlist.length === 0 && (
                  <div className="text-sm text-muted-foreground sm:flex-1 text-center sm:text-left py-2">
                    {t.live?.emptyWatchlistMessage ||
                      "Add runners to your watchlist"}
                  </div>
                )}

                {selectionMode === "country" && !selectedCountry && (
                  <div className="text-sm text-muted-foreground sm:flex-1 text-center sm:text-left py-2">
                    {t.live?.selectTeamToView || "Select a country"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Race Map */}
          <RaceMap bibFilter={filteredBibs} />
        </div>
      </div>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}

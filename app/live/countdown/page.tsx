"use client";

import { useState, useEffect } from "react";
import { RaceClock } from "@/components/live/RaceClock";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { OfficialTimingBanner } from "@/components/live/OfficialTimingBanner";
import { CountdownCard } from "@/components/live/CountdownCard";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveFilters } from "@/lib/hooks/useLiveFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, RefreshCw, Users, Grid3x3, List } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { PageTitle } from "@/components/PageTitle";
import type { RaceInfo } from "@/types/race";
import type { CountdownResponse, NextLapPrediction } from "@/types/live-race";

export default function CountdownPage() {
  const { t } = useLanguage();
  const { watchlist } = useWatchlist();

  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);

  // Use persistent filters hook
  const { filters, setFilter } = useLiveFilters("countdown", {
    country: "",
    gender: "all",
    view: "grid",
  });

  const selectedCountry = filters.country || "";
  const selectedGender = (filters.gender as "m" | "w" | "all") || "all";
  const viewLayout = (filters.view as "grid" | "table") || "grid";

  // Countdown data
  const [countdownData, setCountdownData] = useState<CountdownResponse | null>(
    null
  );
  const [loadingCountdown, setLoadingCountdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);

  // Fetch race info, simulation config, and countries
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

    async function fetchCountries() {
      try {
        // Fetch countries from leaderboard once
        const res = await fetch("/api/race/leaderboard?filter=overall", {
          cache: "no-store",
        });
        const data = await res.json();
        const uniqueCountries = Array.from(
          new Set(data.entries.map((e: any) => e.country))
        ).sort();
        setCountries(uniqueCountries as string[]);
      } catch (err) {
        console.error("Failed to fetch countries:", err);
      }
    }

    fetchRaceInfo();
    fetchSimulationConfig();
    fetchCountries();

    const interval = setInterval(fetchSimulationConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch countdown data
  const fetchCountdownData = async (bibs?: number[]) => {
    setLoadingCountdown(true);
    setError(null);

    try {
      let url = "/api/race/countdown?";

      if (bibs && bibs.length > 0) {
        url += `bibs=${bibs.join(",")}`;
      } else if (selectedCountry) {
        url += `country=${selectedCountry}`;
        // Only add gender filter if not "all"
        if (selectedGender !== "all") {
          url += `&gender=${selectedGender}`;
        }
      } else {
        setError("Please select a team or add runners to watchlist");
        setLoadingCountdown(false);
        return;
      }

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch countdown data");
      }

      const data: CountdownResponse = await res.json();
      setCountdownData(data);
    } catch (err) {
      console.error("Error fetching countdown:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingCountdown(false);
    }
  };

  // Auto-fetch team countdown when country/gender changes
  useEffect(() => {
    if (selectedCountry) {
      fetchCountdownData();

      // Poll every 5 seconds
      const interval = setInterval(() => {
        fetchCountdownData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedCountry, selectedGender]);

  // Get crew offset from server
  const effectiveCrewOffset = countdownData?.crewSpotOffset ?? 0;

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
        title={`${t.live?.countdown || "Countdown"} | ${
          t.live?.title || "Live"
        }`}
      />
      <div className="min-h-screen bg-background">
        <OfficialTimingBanner />
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-4 px-4 space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">
              {t.live?.countdown || "Countdown"}
            </h1>
            <RaceClock race={raceInfo} />
          </div>

          {/* Tabs and Team Selection */}
          <Tabs defaultValue="team" className="w-full">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-4">
              <TabsList>
                <TabsTrigger value="team">
                  <Users className="h-4 w-4 mr-2" />
                  {t.live?.team || "Team"}
                </TabsTrigger>
                <TabsTrigger value="watchlist">
                  <Star className="h-4 w-4 mr-2" />
                  {t.live?.watchlist || "Watchlist"} ({watchlist.length})
                </TabsTrigger>
              </TabsList>

              {/* View Toggle and Team Selection */}
              <div className="flex flex-wrap gap-3 items-end">
                {/* View Toggle */}
                <div>
                  <Label className="text-xs mb-1 block">
                    {t.live?.view || "View"}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={viewLayout === "grid" ? "default" : "outline"}
                      onClick={() => setFilter("view", "grid")}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewLayout === "table" ? "default" : "outline"}
                      onClick={() => setFilter("view", "table")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Gender Selection */}
                <div>
                  <Label className="text-xs mb-1 block">
                    {t.common?.gender || "Gender"}
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={selectedGender === "all" ? "default" : "outline"}
                      onClick={() => setFilter("gender", "all")}
                    >
                      {t.common?.all || "All"}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedGender === "m" ? "default" : "outline"}
                      onClick={() => setFilter("gender", "m")}
                    >
                      {t.common?.men || "Men"}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedGender === "w" ? "default" : "outline"}
                      onClick={() => setFilter("gender", "w")}
                    >
                      {t.common?.women || "Women"}
                    </Button>
                  </div>
                </div>

                {/* Country Selection */}
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs mb-1 block">
                    {t.live?.selectTeam || "Select Team"}
                  </Label>
                  <Select
                    value={selectedCountry}
                    onValueChange={(value) => setFilter("country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          t.runners?.allCountries || "Select country..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
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
              </div>
            </div>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-4">
              {/* Team Results */}
              {!selectedCountry && (
                <div className="text-center py-12 border rounded-lg bg-muted/30">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t.live?.noTeamSelected || "No Team Selected"}
                  </h3>
                  <p className="text-muted-foreground">
                    {t.live?.selectTeamToView ||
                      "Select a country and gender to view countdown"}
                  </p>
                </div>
              )}

              {selectedCountry && loadingCountdown && !countdownData && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {t.live?.loading || "Laddar..."}
                  </p>
                </div>
              )}

              {selectedCountry && error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                  {t.common?.error || "Error"}: {error}
                </div>
              )}

              {selectedCountry &&
                countdownData &&
                countdownData.predictions.length === 0 && (
                  <div className="text-center py-12 border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      {t.live?.noRunnersFound ||
                        "No runners found for this team"}
                    </p>
                  </div>
                )}

              {selectedCountry &&
              countdownData &&
              countdownData.predictions.length > 0 ? (
                <>
                  {viewLayout === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {[...countdownData.predictions]
                        .sort(
                          (a, b) => a.timeUntilTimingMat - b.timeUntilTimingMat
                        )
                        .map((prediction) => (
                          <CountdownCard
                            key={prediction.bib}
                            prediction={prediction}
                            crewSpotOffset={effectiveCrewOffset}
                          />
                        ))}
                    </div>
                  ) : (
                    <CountdownTable
                      predictions={[...countdownData.predictions].sort(
                        (a, b) => a.timeUntilTimingMat - b.timeUntilTimingMat
                      )}
                      crewSpotOffset={effectiveCrewOffset}
                    />
                  )}
                </>
              ) : selectedCountry &&
                countdownData &&
                countdownData.predictions.length === 0 &&
                !loadingCountdown ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No runners found for selected filters.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try refreshing or check if the simulation is running.
                  </p>
                </Card>
              ) : null}
            </TabsContent>

            {/* Watchlist Tab */}
            <TabsContent value="watchlist" className="space-y-4">
              <WatchlistCountdown
                watchlist={watchlist}
                effectiveCrewOffset={effectiveCrewOffset}
                fetchCountdownData={fetchCountdownData}
                loadingCountdown={loadingCountdown}
                countdownData={countdownData}
                error={error}
                viewLayout={viewLayout}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

// Table view component
function CountdownTable({
  predictions,
  crewSpotOffset,
}: {
  predictions: NextLapPrediction[];
  crewSpotOffset: number;
}) {
  const { t } = useLanguage();

  const formatTime = (seconds: number): string => {
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
  };

  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-2 font-medium">
                {t.live?.bib || "Bib"}
              </th>
              <th className="text-left p-2 font-medium">
                {t.live?.runner || "Runner"}
              </th>
              <th className="text-right p-2 font-medium">
                {t.live?.timingMat || "Mat"}
              </th>
              <th className="text-right p-2 font-medium">
                {t.live?.crewSpot || "Crew"} ({crewSpotOffset > 0 ? "+" : ""}
                {crewSpotOffset}m)
              </th>
              <th className="text-right p-2 font-medium">
                {t.live?.distance || "Dist."}
              </th>
              <th className="text-right p-2 font-medium">
                {t.live?.rank || "Rank"}
              </th>
              <th className="text-right p-2 font-medium hidden sm:table-cell">
                {t.live?.lastPassing || "Last"}
              </th>
              <th className="text-right p-2 font-medium hidden md:table-cell">
                {t.live?.estimatedLapTime || "Est."}
              </th>
              <th className="text-center p-2 font-medium hidden lg:table-cell">
                Conf
              </th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => {
              const now = Date.now();
              const lastPassingDate = new Date(prediction.lastPassingTime);
              const timeSinceLastPassing =
                (now - lastPassingDate.getTime()) / 1000;
              const additionalElapsed =
                timeSinceLastPassing - prediction.timeSinceLastPassing;
              const currentTimeUntilTimingMat =
                prediction.timeUntilTimingMat - additionalElapsed;
              const currentTimeUntilCrewSpot =
                prediction.timeUntilCrewSpot - additionalElapsed;
              const isOverdueTimingMat = currentTimeUntilTimingMat < 0;
              const isOverdueCrewSpot = currentTimeUntilCrewSpot < 0;

              // Determine row background color based on time until timing mat
              const getRowColorClass = () => {
                if (isOverdueTimingMat) return "bg-red-50 dark:bg-red-950/20";
                if (currentTimeUntilTimingMat <= 60)
                  return "bg-green-50 dark:bg-green-950/20"; // <= 1 minute
                if (currentTimeUntilTimingMat <= 120)
                  return "bg-yellow-50 dark:bg-yellow-950/20"; // <= 2 minutes
                return "";
              };

              return (
                <tr
                  key={prediction.bib}
                  className={`border-b last:border-b-0 hover:bg-muted/30 transition-colors ${getRowColorClass()}`}
                >
                  <td className="p-2 font-bold text-muted-foreground">
                    #{prediction.bib}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <ReactCountryFlag
                        countryCode={getCountryCodeForFlag(prediction.country)}
                        svg
                        style={{ width: "1.2em", height: "0.8em" }}
                      />
                      <span className="font-medium truncate max-w-[200px]">
                        {prediction.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`p-2 text-right font-bold tabular-nums ${
                      isOverdueTimingMat ? "text-red-500" : "text-primary"
                    }`}
                  >
                    {isOverdueTimingMat && "+"}
                    {formatTime(currentTimeUntilTimingMat)}
                  </td>
                  <td
                    className={`p-2 text-right font-bold tabular-nums ${
                      isOverdueCrewSpot
                        ? "text-red-500"
                        : "text-secondary-foreground"
                    }`}
                  >
                    {isOverdueCrewSpot && "+"}
                    {formatTime(currentTimeUntilCrewSpot)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {prediction.distanceKm.toFixed(3)} km
                  </td>
                  <td className="p-2 text-right font-bold">
                    {prediction.genderRank}
                  </td>
                  <td className="p-2 text-right text-muted-foreground hidden sm:table-cell">
                    {formatTimeAgo(timeSinceLastPassing)}
                  </td>
                  <td className="p-2 text-right text-muted-foreground hidden md:table-cell">
                    {formatTime(prediction.predictedLapTime)}
                  </td>
                  <td className="p-2 text-center hidden lg:table-cell">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        prediction.confidence >= 0.8
                          ? "bg-green-500"
                          : prediction.confidence >= 0.5
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }`}
                      title={`${(prediction.confidence * 100).toFixed(0)}%`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Watchlist sub-component
function WatchlistCountdown({
  watchlist,
  effectiveCrewOffset,
  fetchCountdownData,
  loadingCountdown,
  countdownData,
  error,
  viewLayout,
}: {
  watchlist: number[];
  effectiveCrewOffset: number;
  fetchCountdownData: (bibs?: number[]) => void;
  loadingCountdown: boolean;
  countdownData: CountdownResponse | null;
  error: string | null;
  viewLayout: "grid" | "table";
}) {
  const { t } = useLanguage();

  // Auto-fetch when watchlist changes
  useEffect(() => {
    if (watchlist.length > 0) {
      fetchCountdownData(watchlist);

      // Poll every 5 seconds
      const interval = setInterval(() => {
        fetchCountdownData(watchlist);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [watchlist]);

  if (watchlist.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {t.live?.emptyWatchlistTitle || "No favorites selected"}
        </h3>
        <p className="text-muted-foreground">
          {t.live?.emptyWatchlistMessage ||
            "Add runners to your watchlist from the leaderboard"}
        </p>
      </div>
    );
  }

  if (loadingCountdown && !countdownData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {t.live?.loading || "Laddar..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
        {t.common?.error || "Error"}: {error}
      </div>
    );
  }

  if (countdownData && countdownData.predictions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">
          {t.live?.noRunnersFound ||
            "No countdown data available for watchlist runners"}
        </p>
      </div>
    );
  }

  const sortedPredictions = [...(countdownData?.predictions || [])].sort(
    (a, b) => a.timeUntilTimingMat - b.timeUntilTimingMat
  );

  return (
    <>
      {viewLayout === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {sortedPredictions.map((prediction) => (
            <CountdownCard
              key={prediction.bib}
              prediction={prediction}
              crewSpotOffset={effectiveCrewOffset}
            />
          ))}
        </div>
      ) : (
        <CountdownTable
          predictions={sortedPredictions}
          crewSpotOffset={effectiveCrewOffset}
        />
      )}
    </>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RaceClock } from "@/components/live/RaceClock";
import { LeaderboardTable } from "@/components/live/LeaderboardTable";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { LiveTeamCard } from "@/components/live/LiveTeamCard";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { StaleDataBanner } from "@/components/live/StaleDataBanner";
import { OfficialTimingBanner } from "@/components/live/OfficialTimingBanner";
import {
  useLeaderboard,
  type LeaderboardFilter,
} from "@/lib/hooks/useLeaderboard";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveFilters } from "@/lib/hooks/useLiveFilters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/PageTitle";
import {
  Search,
  RefreshCw,
  List,
  Grid3x3,
  Check,
  ChevronsUpDown,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { cn } from "@/lib/utils";
import type { RaceInfo } from "@/types/race";
import type { LeaderboardEntry, RaceState } from "@/types/live-race";

interface TeamData {
  country: string;
  runners: LeaderboardEntry[];
  teamTotal: number;
  runnerCount: number;
}

function LivePageContent() {
  const { t, language } = useLanguage();

  // Use persistent filters hook
  const { filters, updateFilters, setFilter: setFilterValue } = useLiveFilters("live", {
    view: "individuals",
    filter: "overall",
    search: "",
    country: "all",
    gender: "m",
    teamsView: "detailed",
  });

  const viewMode = (filters.view as "individuals" | "teams") || "individuals";
  const filter = (filters.filter as LeaderboardFilter) || "overall";
  const searchQuery = filters.search || "";
  const countryFilter = filters.country || "all";
  const teamsGender = (filters.gender as "m" | "w") || "m";
  const teamsView = (filters.teamsView as "detailed" | "compact") || "detailed";

  const [countryComboboxOpen, setCountryComboboxOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10); // Show 10 initially
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [raceState, setRaceState] = useState<RaceState>("not_started");

  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();

  const { data, loading, error, refetch } = useLeaderboard(
    filter,
    watchlist,
    10000 // Poll every 10 seconds for more responsive updates
  );

  // Fetch race info and simulation config
  useEffect(() => {
    async function fetchRaceInfo() {
      try {
        const res = await fetch("/api/race");
        const data = await res.json();
        setRaceInfo(data);

        // Calculate race state based on current time
        const now = new Date();
        const startTime = new Date(data.start_time);
        const endTime = new Date(data.end_time);

        let calculatedState: RaceState = "not_started";
        if (now >= endTime) {
          calculatedState = "finished";
        } else if (now >= startTime) {
          calculatedState = "live";
        }
        setRaceState(calculatedState);
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

    // Poll simulation config every 10 seconds
    const interval = setInterval(fetchSimulationConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [filter, searchQuery, countryFilter]);

  // Fetch teams data
  useEffect(() => {
    if (viewMode !== "teams") return;

    async function fetchTeams() {
      setLoadingTeams(true);
      try {
        // Add cache-busting timestamp
        const timestamp = Date.now();
        const res = await fetch(
          `/api/race/teams?gender=${teamsGender}&_t=${timestamp}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      } finally {
        setLoadingTeams(false);
      }
    }

    fetchTeams();
    const interval = setInterval(fetchTeams, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [viewMode, teamsGender]);

  // Filter entries by search query and country
  const filteredEntries =
    data?.entries.filter((entry) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          entry.name.toLowerCase().includes(query) ||
          entry.bib.toString().includes(query) ||
          entry.country.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (
        countryFilter &&
        countryFilter !== "all" &&
        entry.country !== countryFilter
      ) {
        return false;
      }
      return true;
    }) || [];

  // Get unique countries from data for the filter dropdown
  const countries = Array.from(
    new Set(data?.entries.map((e) => e.country) || [])
  ).sort();

  // Slice entries for pagination
  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = filteredEntries.length > visibleCount;

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
        title={`${t.live?.title || "Live"} ${
          t.live?.leaderboard || "Leaderboard"
        }`}
      />
      <div className="min-h-screen bg-background">
        <OfficialTimingBanner />
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto px-4 pt-4">
          <StaleDataBanner raceState={raceState} />
        </div>
        <div className="container mx-auto py-4 px-4 space-y-4">
          {/* Race Clock and View Mode Tabs */}
          <div className="flex flex-row items-center justify-between gap-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => {
                setFilterValue("view", v);
              }}
            >
              <TabsList>
                <TabsTrigger value="individuals">
                  {t.live?.individuals || "Individuellt"}
                </TabsTrigger>
                <TabsTrigger value="teams">
                  {t.live?.teams || "Lag"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <RaceClock race={raceInfo} />
          </div>

          {viewMode === "individuals" && (
            <>
              {/* Filters and Search */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <Tabs
                      value={filter}
                      onValueChange={(v) => {
                        setFilterValue("filter", v);
                      }}
                    >
                      <TabsList className="w-full sm:w-auto">
                        <TabsTrigger
                          value="overall"
                          className="flex-1 sm:flex-initial"
                        >
                          {t.live?.overall || "Totalt"}
                        </TabsTrigger>
                        <TabsTrigger
                          value="men"
                          className="flex-1 sm:flex-initial"
                        >
                          {t.live?.men || "Herrar"}
                        </TabsTrigger>
                        <TabsTrigger
                          value="women"
                          className="flex-1 sm:flex-initial"
                        >
                          {t.live?.women || "Damer"}
                        </TabsTrigger>
                        <TabsTrigger
                          value="watchlist"
                          className="flex-1 sm:flex-initial"
                        >
                          {t.live?.watchlist || "Favoritlista"}{" "}
                          {watchlist.length > 0 && `(${watchlist.length})`}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <Popover
                      open={countryComboboxOpen}
                      onOpenChange={setCountryComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryComboboxOpen}
                          className="w-full sm:w-[180px] justify-between"
                        >
                          {countryFilter === "all" ? (
                            t.runners?.allCountries || "Alla länder"
                          ) : (
                            <div className="flex items-center gap-2">
                              <ReactCountryFlag
                                countryCode={getCountryCodeForFlag(
                                  countryFilter
                                )}
                                svg
                                style={{
                                  width: "1.5em",
                                  height: "1em",
                                }}
                              />
                              <span>{countryFilter}</span>
                            </div>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={
                              t.runners?.searchCountry || "Sök land..."
                            }
                          />
                          <CommandList>
                            <CommandEmpty>
                              {t.runners?.noCountryFound ||
                                "Inget land hittades"}
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => {
                                  setFilterValue("country", "all");
                                  setCountryComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    countryFilter === "all"
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {t.runners?.allCountries || "Alla länder"}
                              </CommandItem>
                              {countries.map((country) => {
                                const twoLetterCode =
                                  getCountryCodeForFlag(country);
                                return (
                                  <CommandItem
                                    key={country}
                                    value={country}
                                    onSelect={(currentValue) => {
                                      const newCountry =
                                        currentValue.toUpperCase();
                                      setFilterValue("country", newCountry);
                                      setCountryComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        countryFilter === country
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <ReactCountryFlag
                                      countryCode={twoLetterCode}
                                      svg
                                      style={{
                                        width: "1.5em",
                                        height: "1em",
                                        marginRight: "0.5rem",
                                      }}
                                    />
                                    {country}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1 lg:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={
                          t.live?.searchPlaceholder ||
                          "Sök efter namn, startnummer eller land..."
                        }
                        value={searchQuery}
                        onChange={(e) => {
                          setFilterValue("search", e.target.value);
                        }}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => refetch()}
                      disabled={loading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Last Updated - always show */}
              {data && (
                <div className="text-right text-xs text-muted-foreground pb-2">
                  {t.live?.lastUpdate || "Senast uppdaterad"}:{" "}
                  {new Date(data.lastUpdate).toLocaleTimeString()}
                </div>
              )}

              {/* Race Status - only show when live or in simulation */}
              {data && (raceState === "live" || simulationMode) && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-2">
                  <span className="flex items-center gap-2">
                    {(raceState === "live" || simulationMode) && (
                      <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    {t.live?.status || "Status"}:{" "}
                    <span className="capitalize font-medium">
                      {simulationMode ? "Simulation" : raceState.replace("_", " ")}
                    </span>
                  </span>
                  <span>
                    {t.live?.totalRunners || "Antal löpare"}:{" "}
                    <span className="font-medium">{data.totalRunners}</span>
                  </span>
                  {filteredEntries.length !== data.totalRunners && (
                    <span>
                      {t.live?.showing || "Visar"}:{" "}
                      <span className="font-medium">
                        {filteredEntries.length}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                  {t.common?.error || "Fel"}: {error}
                </div>
              )}

              {/* Loading State */}
              {loading && !data && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {t.live?.loadingLeaderboard || "Laddar resultatlista..."}
                  </p>
                </div>
              )}

              {/* Leaderboard Table */}
              {data && (
                <>
                  {filter === "watchlist" && watchlist.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/30">
                      <div className="max-w-md mx-auto">
                        <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                          {t.live?.emptyWatchlistTitle || "Ingen favorit vald"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {t.live?.emptyWatchlistMessage ||
                            "Lägg till löpare i din favoritlista genom att klicka på stjärnan bredvid deras namn."}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFilterValue("filter", "overall");
                          }}
                        >
                          {t.live?.viewAllRunners || "Visa alla löpare"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <LeaderboardTable
                        entries={visibleEntries}
                        onToggleWatchlist={toggleWatchlist}
                        isInWatchlist={isInWatchlist}
                        showGenderRank={filter === "men" || filter === "women" || filter === "watchlist"}
                      />

                      {/* Pagination Controls */}
                      {hasMore && (
                        <div className="flex justify-center gap-3 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setVisibleCount((prev) => prev + 10)}
                          >
                            {t.live?.loadMore || "Ladda fler"} (+10)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setVisibleCount((prev) => prev + 50)}
                          >
                            {t.live?.loadMore || "Ladda fler"} (+50)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setVisibleCount(filteredEntries.length)
                            }
                          >
                            {t.live?.loadAll || "Ladda alla"} (
                            {filteredEntries.length})
                          </Button>
                        </div>
                      )}

                      {/* Show count indicator */}
                      {filteredEntries.length > 0 && (
                        <div className="text-center text-sm text-muted-foreground mt-4">
                          {t.live?.showing || "Visar"} {visibleEntries.length}{" "}
                          {t.live?.of || "av"} {filteredEntries.length}{" "}
                          {t.live?.runners || "löpare"}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {viewMode === "teams" && (
            <div className="space-y-4">
              {/* Gender Filter and View Toggle */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant={teamsGender === "m" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterValue("gender", "m");
                    }}
                  >
                    {t.live?.men || "Herrar"}
                  </Button>
                  <Button
                    variant={teamsGender === "w" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterValue("gender", "w");
                    }}
                  >
                    {t.live?.women || "Damer"}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={teamsView === "detailed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterValue("teamsView", "detailed");
                    }}
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    {t.teams?.showAll || "Detaljerad"}
                  </Button>
                  <Button
                    variant={teamsView === "compact" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterValue("teamsView", "compact");
                    }}
                  >
                    <List className="h-4 w-4 mr-2" />
                    {t.live?.compact || "Kompakt"}
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {loadingTeams && teams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {t.live?.loading || "Laddar..."}
                  </p>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>{t.live?.noTeamsFound || "Inga lag hittades"}</p>
                </div>
              ) : teamsView === "compact" ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium text-sm">
                          {t.live?.rank || "Plac."}
                        </th>
                        <th className="text-left p-3 font-medium text-sm">
                          {t.teams?.country || "Land"}
                        </th>
                        <th className="text-right p-3 font-medium text-sm">
                          {t.teams?.total || "Totalt"}
                        </th>
                        <th className="text-right p-3 font-medium text-sm hidden sm:table-cell">
                          {t.live?.runners || "Löpare"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr
                          key={team.country}
                          className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{index + 1}</span>
                              {index < 3 && (
                                <span className="text-lg">
                                  {index === 0
                                    ? "🥇"
                                    : index === 1
                                    ? "🥈"
                                    : "🥉"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <ReactCountryFlag
                                countryCode={getCountryCodeForFlag(
                                  team.country
                                )}
                                svg
                                style={{
                                  width: "1.5em",
                                  height: "1em",
                                }}
                              />
                              <span className="font-medium">
                                {team.country}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {team.teamTotal.toFixed(3)} km
                          </td>
                          <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">
                            {team.runnerCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team, index) => (
                    <LiveTeamCard
                      key={team.country}
                      rank={index + 1}
                      country={team.country}
                      runners={team.runners}
                      teamTotal={team.teamTotal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LivePageContent />
    </Suspense>
  );
}

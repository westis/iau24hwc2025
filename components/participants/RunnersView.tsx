"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactCountryFlag from "react-country-flag";
import { RunnerTable } from "@/components/tables/runner-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Check, ChevronsUpDown, Edit3 } from "lucide-react";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth/auth-context";
import type { Runner } from "@/types/runner";

interface RunnersViewProps {
  initialGender?: "M" | "W";
  initialCountry?: string;
  initialMetric?: "last-3-years" | "all-time";
  onGenderChange?: (gender: "M" | "W") => void;
  onCountryChange?: (country: string) => void;
  onMetricChange?: (metric: "last-3-years" | "all-time") => void;
  showHeader?: boolean;
}

export function RunnersView({
  initialGender = "M",
  initialCountry = "all",
  initialMetric = "last-3-years",
  onGenderChange,
  onCountryChange,
  onMetricChange,
  showHeader = true,
}: RunnersViewProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<"M" | "W">(
    initialGender
  );
  const [selectedMetric, setSelectedMetric] = useState<
    "last-3-years" | "all-time"
  >(initialMetric);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>(initialCountry);
  const [countryComboboxOpen, setCountryComboboxOpen] = useState(false);

  // Get unique countries from runners
  const uniqueCountries = useMemo(() => {
    const countries = Array.from(
      new Set(runners.map((r) => r.nationality))
    ).sort();
    return countries;
  }, [runners]);

  useEffect(() => {
    // Fetch filtered runners from API (server-side computation)
    async function fetchRunners() {
      try {
        // Only show full loading spinner on initial load
        if (runners.length === 0) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const params = new URLSearchParams({
          gender: selectedGender,
          metric: selectedMetric,
          country: countryFilter,
          search: searchQuery,
        });

        const response = await fetch(`/api/runners/filtered?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch runners from API");
        }

        const data = await response.json();
        setRunners(data.runners);
        setError(null);
      } catch (err) {
        console.error("Error loading runners from API:", err);
        setError(err instanceof Error ? err.message : "Failed to load runners");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }

    fetchRunners();
  }, [selectedGender, selectedMetric, countryFilter, searchQuery]);

  // Runners are already filtered, sorted, and ranked by the server!
  // No client-side computation needed - just display them

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.runners.loadingRunners}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t.common.error}: {error}
          </p>
          <p className="text-muted-foreground">{t.runners.runBackendTools}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Subtle loading indicator when refreshing */}
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-10">
          <div className="h-full bg-primary animate-pulse" />
        </div>
      )}

      {showHeader && (
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.runners.title}</h1>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => router.push("/admin/runners/quick-edit")}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Quick Edit
            </Button>
          )}
        </div>
      )}

      {/* Filters - All on one row when space allows */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Gender toggle */}
          <div
            className="inline-flex rounded-lg border border-input bg-background p-1"
            role="group"
          >
            <Button
              variant={selectedGender === "M" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedGender("M");
                onGenderChange?.("M");
              }}
              className={selectedGender === "M" ? "" : "hover:bg-accent"}
            >
              {t.runners.men}
            </Button>
            <Button
              variant={selectedGender === "W" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedGender("W");
                onGenderChange?.("W");
              }}
              className={selectedGender === "W" ? "" : "hover:bg-accent"}
            >
              {t.runners.women}
            </Button>
          </div>

          {/* Time period toggle */}
          <div
            className="inline-flex rounded-lg border border-input bg-background p-1"
            role="group"
          >
            <Button
              variant={selectedMetric === "last-3-years" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedMetric("last-3-years");
                onMetricChange?.("last-3-years");
              }}
              className={
                selectedMetric === "last-3-years" ? "" : "hover:bg-accent"
              }
            >
              2023-2025
            </Button>
            <Button
              variant={selectedMetric === "all-time" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedMetric("all-time");
                onMetricChange?.("all-time");
              }}
              className={selectedMetric === "all-time" ? "" : "hover:bg-accent"}
            >
              {t.runners.allTime}
            </Button>
          </div>

          {/* Search input */}
          <Input
            placeholder={t.runners.searchByName}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="flex-1 min-w-[180px] max-w-[300px]"
          />

          {/* Country dropdown */}
          <Popover
            open={countryComboboxOpen}
            onOpenChange={setCountryComboboxOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryComboboxOpen}
                className="min-w-[160px] justify-between"
              >
                {countryFilter === "all" ? (
                  t.runners.allCountries
                ) : (
                  <div className="flex items-center gap-2">
                    <ReactCountryFlag
                      countryCode={getCountryCodeForFlag(countryFilter)}
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
                <CommandInput placeholder={t.runners.searchCountry} />
                <CommandList>
                  <CommandEmpty>{t.runners.noCountryFound}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setCountryFilter("all");
                        onCountryChange?.("all");
                        setCountryComboboxOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          countryFilter === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {t.runners.allCountries}
                    </CommandItem>
                    {uniqueCountries.map((country) => {
                      const twoLetterCode = getCountryCodeForFlag(country);
                      return (
                        <CommandItem
                          key={country}
                          value={country}
                          onSelect={(currentValue) => {
                            const newCountry = currentValue.toUpperCase();
                            setCountryFilter(newCountry);
                            onCountryChange?.(newCountry);
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
                          <div className="flex items-center gap-2">
                            <ReactCountryFlag
                              countryCode={twoLetterCode}
                              svg
                              style={{
                                width: "1.5em",
                                height: "1em",
                              }}
                            />
                            <span>{country}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div
        className={`transition-opacity duration-200 ${
          isRefreshing ? "opacity-60" : "opacity-100"
        }`}
      >
        <RunnerTable
          runners={runners}
          metric={selectedMetric}
          onManualMatch={(runner) => {
            router.push("/match");
          }}
          onRowClick={(runnerId) => {
            router.push(`/runners/${runnerId}`);
          }}
        />
      </div>
    </div>
  );
}

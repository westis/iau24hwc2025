"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactCountryFlag from "react-country-flag";
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
import { Check, ChevronsUpDown, Instagram, ExternalLink } from "lucide-react";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Runner } from "@/types/runner";
import Image from "next/image";
import Link from "next/link";

interface SocialViewProps {
  initialGender?: "M" | "W";
  initialCountry?: string;
  onGenderChange?: (gender: "M" | "W") => void;
  onCountryChange?: (country: string) => void;
  showHeader?: boolean;
}

export function SocialView({
  initialGender = "M",
  initialCountry = "all",
  onGenderChange,
  onCountryChange,
  showHeader = true,
}: SocialViewProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<"M" | "W">(
    initialGender
  );
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
    async function fetchRunners() {
      try {
        setLoading(true);

        const response = await fetch("/api/runners");
        if (!response.ok) {
          throw new Error("Failed to fetch runners from API");
        }

        const data = await response.json();
        const fetchedRunners = data.runners as Runner[];

        setRunners(fetchedRunners);
      } catch (err) {
        console.error("Error loading runners from API:", err);
        setError(err instanceof Error ? err.message : "Failed to load runners");
      } finally {
        setLoading(false);
      }
    }

    fetchRunners();
  }, []);

  // Filter runners with photos or social links
  const filteredRunners = useMemo(() => {
    return runners
      .filter((runner) => runner.gender === selectedGender)
      .filter((runner) => {
        // Only show runners with photos OR social links
        return (
          runner.photoUrl ||
          runner.avatarUrl ||
          runner.instagramUrl ||
          runner.stravaUrl
        );
      })
      .filter((runner) => {
        if (countryFilter !== "all" && runner.nationality !== countryFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            runner.firstname.toLowerCase().includes(query) ||
            runner.lastname.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by name
        const aName = `${a.lastname} ${a.firstname}`;
        const bName = `${b.lastname} ${b.firstname}`;
        return aName.localeCompare(bName);
      });
  }, [runners, selectedGender, countryFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}...</p>
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
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        {/* Gender toggle */}
        <div className="flex flex-wrap items-center gap-4">
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
        </div>

        {/* Search and Country filter */}
        <div className="flex flex-col sm:flex-row gap-4 lg:ml-auto">
          <Input
            placeholder={t.runners.searchByName}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full sm:w-[200px]"
          />
          <Popover
            open={countryComboboxOpen}
            onOpenChange={setCountryComboboxOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryComboboxOpen}
                className="w-full sm:w-[200px] justify-between"
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

      {/* Photo Grid */}
      {filteredRunners.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No runners with photos or social links found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRunners.map((runner) => (
            <div
              key={runner.id}
              className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all duration-200"
            >
              {/* Photo */}
              <div
                className="relative aspect-square w-full overflow-hidden bg-muted cursor-pointer"
                onClick={() => router.push(`/runners/${runner.id}`)}
              >
                {runner.avatarUrl || runner.photoUrl ? (
                  <Image
                    src={
                      runner.avatarUrl
                        ? runner.avatarUrl.replace(/\.jpg$/i, "@3x.jpg")
                        : runner.photoUrl!
                    }
                    alt={`${runner.firstname} ${runner.lastname}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    quality={95}
                    unoptimized
                    onError={(e) => {
                      // Fallback to @2x, then regular
                      const img = e.target as HTMLImageElement;
                      if (img.src.includes("@3x")) {
                        img.src = img.src.replace("@3x.jpg", "@2x.jpg");
                      } else if (img.src.includes("@2x")) {
                        img.src = img.src.replace("@2x.jpg", ".jpg");
                      } else if (runner.photoUrl) {
                        img.src = runner.photoUrl;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <div className="text-4xl font-bold text-muted-foreground">
                      {runner.firstname[0]}
                      {runner.lastname[0]}
                    </div>
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
              </div>

              {/* Info */}
              <div className="p-4">
                <Link
                  href={`/runners/${runner.id}`}
                  className="block hover:underline"
                >
                  <h3 className="font-semibold text-lg mb-1">
                    {runner.firstname} {runner.lastname}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <ReactCountryFlag
                    countryCode={getCountryCodeForFlag(runner.nationality)}
                    svg
                    style={{
                      width: "1.5em",
                      height: "1em",
                    }}
                  />
                  <span>{runner.nationality}</span>
                </div>

                {/* Social Links */}
                {(runner.instagramUrl || runner.stravaUrl) && (
                  <div className="flex gap-2">
                    {runner.instagramUrl && (
                      <a
                        href={runner.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Instagram className="h-3.5 w-3.5" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {runner.stravaUrl && (
                      <a
                        href={runner.stravaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                        </svg>
                        <span>Strava</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

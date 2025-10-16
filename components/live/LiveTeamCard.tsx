"use client";

import { useState } from "react";
import ReactCountryFlag from "react-country-flag";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { getCountryNameI18n } from "@/lib/utils/country-names-i18n";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/live-race";

interface LiveTeamCardProps {
  rank: number;
  country: string;
  runners: LeaderboardEntry[];
  teamTotal: number;
}

function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "";
  }
}

export function LiveTeamCard({
  rank,
  country,
  runners,
  teamTotal,
}: LiveTeamCardProps) {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const medal = getMedalEmoji(rank);
  const countryName = getCountryNameI18n(country, language as "en" | "sv");
  const twoLetterCode = getCountryCodeForFlag(country);
  const top3 = runners.slice(0, 3);

  return (
    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {medal && <span className="text-xl">{medal}</span>}
          <span className="text-sm font-medium text-muted-foreground">
            #{rank}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {t.teams?.total || "Totalt"}
          </div>
          <div className="text-lg font-semibold">{teamTotal.toFixed(3)} km</div>
        </div>
      </div>

      {/* Country */}
      <div className="flex items-center gap-3 mb-3">
        <ReactCountryFlag
          countryCode={twoLetterCode}
          svg
          style={{
            width: "3em",
            height: "2em",
            borderRadius: "4px",
          }}
        />
        <div>
          <h3 className="font-semibold">{countryName}</h3>
          <p className="text-xs text-muted-foreground">
            {runners.length} {t.live?.runners || "löpare"}
          </p>
        </div>
      </div>

      {/* Top 3 Runners - Collapsed */}
      {!isExpanded && (
        <div className="space-y-1.5">
          {top3.map((runner, index) => (
            <div
              key={runner.bib}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-4">{index + 1}.</span>
                <span className="truncate">{runner.name}</span>
              </div>
              <span className="text-muted-foreground text-xs font-mono">
                {runner.distanceKm.toFixed(3)} km
              </span>
            </div>
          ))}
        </div>
      )}

      {/* All Runners - Expanded */}
      {isExpanded && (
        <div className="space-y-1.5">
          {runners.map((runner, index) => {
            const isInTopThree = index < 3;
            return (
              <div
                key={runner.bib}
                className={cn(
                  "flex items-center justify-between text-sm",
                  !isInTopThree && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <span className="truncate">{runner.name}</span>
                </div>
                <span className="text-muted-foreground text-xs font-mono">
                  {runner.distanceKm.toFixed(3)} km
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expand/Collapse Button */}
      {runners.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              {t.teams?.showLess || "Visa mindre"}{" "}
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              {t.teams?.showAll || "Visa alla"} {runners.length}{" "}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}






"use client";

import ReactCountryFlag from "react-country-flag";
import { getCountryCodeForFlag } from "@/lib/utils/country-codes";
import { getCountryNameI18n } from "@/lib/utils/country-names-i18n";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types/live-race";

interface TeamData {
  country: string;
  runners: LeaderboardEntry[];
  teamTotal: number;
  runnerCount: number;
}

interface TeamRaceTrackProps {
  teams: TeamData[];
  maxTeams?: number;
}

export function TeamRaceTrack({ teams, maxTeams = 6 }: TeamRaceTrackProps) {
  const { t, language } = useLanguage();

  // Get top N teams
  const topTeams = teams.slice(0, maxTeams);

  // If less than 2 teams, don't show visualization
  if (topTeams.length < 2) {
    return null;
  }

  // Calculate gaps from leader
  const leaderTotal = topTeams[0].teamTotal;
  const teamsWithGaps = topTeams.map((team, index) => ({
    ...team,
    rank: index + 1,
    gap: team.teamTotal - leaderTotal, // Negative for trailing teams
    gapKm: Math.abs(team.teamTotal - leaderTotal),
  }));

  // Get max gap for scaling (absolute value)
  const maxGap = Math.abs(teamsWithGaps[teamsWithGaps.length - 1].gap);

  // Calculate positions (0-100% along track)
  // Leader at 100% (right), last team at 0% (left)
  const teamsWithPositions = teamsWithGaps.map((team) => ({
    ...team,
    position: maxGap > 0 ? ((team.gap + maxGap) / maxGap) * 100 : 100,
  }));

  return (
    <div className="bg-card border rounded-lg p-6 mb-4">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          {t.live?.teamRace || "Team Race"}
        </h3>
        <span className="text-sm text-muted-foreground">
          ({t.live?.top || "Top"} {topTeams.length})
        </span>
      </div>

      {/* Horizontal Race Track */}
      <div className="relative">
        {/* The track line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-muted via-muted-foreground/20 to-primary/50 rounded-full transform -translate-y-1/2 z-0" />

        {/* Start and finish markers */}
        <div className="absolute top-1/2 left-0 w-2 h-2 bg-muted-foreground rounded-full transform -translate-y-1/2 -translate-x-1 z-10" />
        <div className="absolute top-1/2 right-0 w-3 h-3 bg-primary rounded-full transform -translate-y-1/2 translate-x-1.5 z-10 shadow-lg" />

        {/* Teams positioned along the track */}
        <div className="relative h-32 sm:h-24">
          {teamsWithPositions.map((team, index) => {
            const isLeader = team.rank === 1;
            const twoLetterCode = getCountryCodeForFlag(team.country);
            const countryName = getCountryNameI18n(
              team.country,
              language as "en" | "sv"
            );

            // Alternate positions above/below track to prevent overlap
            const isAbove = index % 2 === 0;

            return (
              <div
                key={team.country}
                className="absolute transition-all duration-500 ease-in-out"
                style={{
                  left: `${team.position}%`,
                  top: isAbove ? "0%" : "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {/* Connector line to track */}
                <div
                  className={`absolute left-1/2 w-0.5 ${
                    isLeader ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  style={{
                    height: isAbove ? "2.5rem" : "2.5rem",
                    top: isAbove ? "auto" : "0",
                    bottom: isAbove ? "0" : "auto",
                    transform: "translateX(-50%)",
                  }}
                />

                {/* Flag and info */}
                <div
                  className={`flex flex-col items-center gap-1 ${
                    isAbove ? "mb-10" : "mt-10"
                  }`}
                >
                  {/* Flag */}
                  <div
                    className={`relative group cursor-pointer ${
                      isLeader
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    } rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow`}
                    title={countryName}
                  >
                    <ReactCountryFlag
                      countryCode={twoLetterCode}
                      svg
                      style={{
                        width: isLeader ? "3em" : "2.5em",
                        height: isLeader ? "2em" : "1.67em",
                        borderRadius: "4px",
                      }}
                    />
                    {isLeader && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        1
                      </div>
                    )}
                  </div>

                  {/* Gap label */}
                  <div className="text-center">
                    <div
                      className={`text-xs font-mono ${
                        isLeader
                          ? "text-primary font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isLeader ? "0.0" : `-${team.gapKm.toFixed(1)}`}
                      <span className="text-[10px] ml-0.5">km</span>
                    </div>
                    {/* Rank badge for non-leaders */}
                    {!isLeader && (
                      <div className="text-[10px] text-muted-foreground/70">
                        #{team.rank}
                      </div>
                    )}
                  </div>

                  {/* Tooltip on hover - country name and total */}
                  <div
                    className={`absolute opacity-0 group-hover:opacity-100 transition-opacity bg-popover border text-popover-foreground text-xs p-2 rounded-md shadow-xl z-50 whitespace-nowrap pointer-events-none ${
                      isAbove ? "top-full mt-2" : "bottom-full mb-2"
                    }`}
                  >
                    <div className="font-semibold">{countryName}</div>
                    <div className="text-muted-foreground">
                      {team.teamTotal.toFixed(3)} km
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {team.runnerCount} {t.live?.runners || "runners"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 justify-center">
        <div className="flex items-center gap-1">
          <span>
            {t.live?.gapFromLeader || "Gap from leader in kilometers"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>{t.live?.hoverForDetails || "Hover for details"}</span>
        </div>
      </div>
    </div>
  );
}

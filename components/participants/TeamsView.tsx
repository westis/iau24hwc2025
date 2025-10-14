"use client";

import { useEffect, useState } from "react";
import { TeamCard } from "@/components/cards/team-card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Team } from "@/types/team";
import type { Gender } from "@/types/runner";

interface TeamsViewProps {
  initialGender?: Gender;
  initialMetric?: "all-time" | "last-3-years";
  onGenderChange?: (gender: Gender) => void;
  onMetricChange?: (metric: "all-time" | "last-3-years") => void;
  showHeader?: boolean;
}

export function TeamsView({
  initialGender = "M",
  initialMetric = "last-3-years",
  onGenderChange,
  onMetricChange,
  showHeader = true,
}: TeamsViewProps) {
  const { t } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [metric, setMetric] = useState<"all-time" | "last-3-years">(
    initialMetric
  );
  const [gender, setGender] = useState<Gender>(initialGender);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pre-computed teams from API (server-side computation)
    async function fetchTeams() {
      try {
        // Only show full loading spinner on initial load
        if (teams.length === 0) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const params = new URLSearchParams({
          gender,
          metric,
        });

        const response = await fetch(`/api/teams/filtered?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch teams from API");
        }

        const data = await response.json();
        setTeams(data.teams);
        setError(null);
      } catch (err) {
        console.error("Error loading teams from API:", err);
        setError(err instanceof Error ? err.message : "Failed to load teams");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }

    fetchTeams();
  }, [gender, metric]);

  // Teams are already computed by the server!
  // No client-side computation needed

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.teams.loadingPredictions}</p>
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
          <p className="text-muted-foreground">{t.teams.runBackendTools}</p>
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t.teams.title}</h1>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Gender Toggle */}
        <div
          className="inline-flex rounded-lg border border-input bg-background p-1"
          role="group"
        >
          <Button
            variant={gender === "M" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setGender("M");
              onGenderChange?.("M");
            }}
            className={gender === "M" ? "" : "hover:bg-accent"}
          >
            {t.teams.men}
          </Button>
          <Button
            variant={gender === "W" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setGender("W");
              onGenderChange?.("W");
            }}
            className={gender === "W" ? "" : "hover:bg-accent"}
          >
            {t.teams.women}
          </Button>
        </div>

        {/* Metric Toggle */}
        <div
          className="inline-flex rounded-lg border border-input bg-background p-1"
          role="group"
        >
          <Button
            variant={metric === "last-3-years" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setMetric("last-3-years");
              onMetricChange?.("last-3-years");
            }}
            className={metric === "last-3-years" ? "" : "hover:bg-accent"}
          >
            {t.teams.last3Years}
          </Button>
          <Button
            variant={metric === "all-time" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setMetric("all-time");
              onMetricChange?.("all-time");
            }}
            className={metric === "all-time" ? "" : "hover:bg-accent"}
          >
            {t.teams.allTime}
          </Button>
        </div>
      </div>

      {/* Teams */}
      <div className={`mb-8 transition-opacity duration-200 ${isRefreshing ? "opacity-60" : "opacity-100"}`}>
        <h2 className="text-lg font-semibold mb-3">
          {gender === "M" ? t.teams.men : t.teams.women} ({teams.length})
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.teams.noTeamData}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, index) => (
              <TeamCard
                key={team.nationality}
                rank={index + 1}
                team={team}
                gender={gender}
                metric={metric}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

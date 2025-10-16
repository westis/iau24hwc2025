"use client";

import { useState, useEffect } from "react";
import { RaceClock } from "@/components/live/RaceClock";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { PageTitle } from "@/components/PageTitle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RaceInfo } from "@/types/race";

export default function MapPage() {
  const { t } = useLanguage();
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);

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

    const interval = setInterval(fetchSimulationConfig, 10000);
    return () => clearInterval(interval);
  }, []);

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
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-4 px-4 space-y-6">
          <RaceClock race={raceInfo} />

          <Card>
            <CardHeader>
              <CardTitle>Virtual Course Map</CardTitle>
              <CardDescription>
                Live runner positions on the course (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <p>
                  Virtual map with live runner tracking will be displayed here
                </p>
                <p className="text-sm">
                  Upload course GPX file in admin panel to enable this feature
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crew Countdown</CardTitle>
              <CardDescription>
                Timing point countdown for watchlist runners (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
              Crew countdown feature will be added here
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

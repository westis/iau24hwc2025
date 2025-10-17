"use client";

import { LiveNavigation } from "@/components/live/LiveNavigation";
import { WeatherForecast } from "@/components/live/WeatherForecast";
import { SimulationBanner } from "@/components/live/SimulationBanner";
import { OfficialTimingBanner } from "@/components/live/OfficialTimingBanner";
import { PageTitle } from "@/components/PageTitle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";

export default function WeatherPage() {
  const { t } = useLanguage();
  const [simulationMode, setSimulationMode] = useState(false);

  useEffect(() => {
    async function fetchSimulationConfig() {
      try {
        const res = await fetch("/api/race/config");
        const data = await res.json();
        setSimulationMode(data.simulation_mode || false);
      } catch (err) {
        console.error("Failed to fetch simulation config:", err);
      }
    }

    fetchSimulationConfig();

    // Poll simulation config every 10 seconds
    const interval = setInterval(fetchSimulationConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageTitle
        title={`${t.live?.title || "Live"} - ${
          t.live?.weatherForecast || "Väderprognos"
        }`}
      />
      <div className="min-h-screen bg-background">
        <OfficialTimingBanner />
        {simulationMode && <SimulationBanner />}
        <LiveNavigation />
        <div className="container mx-auto py-8 px-4">
          <WeatherForecast />
        </div>
      </div>
    </>
  );
}

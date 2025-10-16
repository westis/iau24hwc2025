"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ChartDataResponse } from "@/types/live-race";

interface DistanceChartProps {
  bibs: number[];
  initialRange?: "6h" | "12h" | "24h";
}

export function DistanceChart({
  bibs,
  initialRange = "24h",
}: DistanceChartProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(initialRange);
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    if (bibs.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/race/chart-data?bibs=${bibs.join(",")}&range=${range}`
        );
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bibs, range]);

  if (bibs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t.live?.distanceOverTime || "Distance Over Time"}
          </CardTitle>
          <CardDescription>
            {t.live?.selectRunnersDesc ||
              "Select runners from the leaderboard to view their progress"}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          {t.live?.noRunnersSelected || "No runners selected"}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t.live?.distanceOverTime || "Distance Over Time"}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              {t.live?.loadingChartData || "Loading chart data..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Deprecated Recharts-based chart. Kept as a stub to avoid build errors.
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t.live?.distanceOverTime || "Distance Over Time"}
        </CardTitle>
        <CardDescription>
          {t.live?.projectedDistance ||
            "This chart has been deprecated. Please use the new ApexCharts-based charts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-32 flex items-center justify-center text-muted-foreground">
        {t.common?.comingSoon || "Replaced by DistancePaceChart and GapAnalysisChart"}
      </CardContent>
    </Card>
  );
}

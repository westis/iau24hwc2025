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
import type { ChartDataResponse } from "@/types/live-race";

interface DistanceChartProps {
  bibs: number[];
  initialRange?: "6h" | "12h" | "24h";
}

export function DistanceChart({
  bibs,
  initialRange = "24h",
}: DistanceChartProps) {
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
          <CardTitle>Distance Over Time</CardTitle>
          <CardDescription>
            Select runners from the leaderboard to view their progress
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          No runners selected
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distance Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              Loading chart data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Distance Over Time</CardTitle>
            <CardDescription>
              Projected 24h distance based on current pace
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              variant={range === "6h" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("6h")}
            >
              6h
            </Button>
            <Button
              variant={range === "12h" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("12h")}
            >
              12h
            </Button>
            <Button
              variant={range === "24h" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("24h")}
            >
              24h
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-forecast"
              checked={showForecast}
              onCheckedChange={(checked) => setShowForecast(checked === true)}
            />
            <Label htmlFor="show-forecast" className="text-sm cursor-pointer">
              Show rolling pace forecast
            </Label>
          </div>

          {/* Chart Placeholder */}
          <div className="h-96 border rounded-lg p-4 flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Chart visualization will appear here
              </p>
              <p className="text-sm text-muted-foreground">
                Install recharts:{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  npm install recharts
                </code>
              </p>
              {data && (
                <div className="mt-4 space-y-1">
                  {data.runners.map((runner) => (
                    <div key={runner.bib} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: runner.color }}
                      />
                      <span className="text-sm">
                        {runner.name} - {runner.data.length} data points
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          {data && (
            <div className="flex flex-wrap gap-4 justify-center">
              {data.runners.map((runner) => (
                <div key={runner.bib} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: runner.color }}
                  />
                  <span className="text-sm font-medium">
                    #{runner.bib} {runner.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



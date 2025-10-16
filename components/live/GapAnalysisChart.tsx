"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
 
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ChartDataResponse } from "@/types/live-race";
import type { ApexOptions } from "apexcharts";

// Dynamic import to avoid SSR issues with ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Extend Window interface for ApexCharts
declare global {
  interface Window {
    ApexCharts: any;
  }
}

interface GapAnalysisChartProps {
  bibs: number[];
}

// World Records for 24h
const WORLD_RECORDS = {
  men: 309.399, // Aleksandr Sorokin (2022)
  women: 270.116, // Camille Herron (2023)
};

export function GapAnalysisChart({ bibs }: GapAnalysisChartProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [baselineMode, setBaselineMode] = useState<"manual" | "wr">("wr");
  const [wrGender, setWrGender] = useState<"men" | "women">("men");
  const [manualDistance, setManualDistance] = useState<string>("250");
  const hasInitialData = useRef(false);
  const initialSeriesRef = useRef<any[]>([]);
  const lastXBySeriesRef = useRef<Record<string, number>>({});
  const labelGranularityRef = useRef<"hour" | "half">("hour");
  const prevBaselineRef = useRef<number | null>(null);

 

  // Fetch data with auto-refresh
  useEffect(() => {
    if (bibs.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const url = `/api/race/chart-data?bibs=${bibs.join(
          ","
        )}&_t=${Date.now()}`;
        const res = await fetch(url);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch gap chart data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [bibs]);

 

    const baselineDistance =
      baselineMode === "wr"
        ? WORLD_RECORDS[wrGender]
        : parseFloat(manualDistance) || 250;

  // Transform data to ApexCharts series format (gap from baseline)
  // Use useMemo to prevent unnecessary recalculations
  const series = useMemo(
    () =>
      data?.runners
        .sort((a, b) => a.bib - b.bib) // Stable order for appendData
        .map((runner) => ({
          name: `#${runner.bib} ${runner.name}`,
          data: runner.data.map((point) => ({
            x: point.time * 1000, // Convert to milliseconds
            y: point.projectedKm - baselineDistance, // Gap from baseline
          })),
          color: runner.color,
        })) || [],
    [data, baselineDistance]
  );

  // Initialize frozen series
  if (!hasInitialData.current && series.length > 0) {
    initialSeriesRef.current = series;
    hasInitialData.current = true;
    prevBaselineRef.current = baselineDistance;
    lastXBySeriesRef.current = series.reduce((acc: Record<string, number>, s: any) => {
      const last = s.data[s.data.length - 1];
      acc[s.name] = last ? last.x : -1;
      return acc;
    }, {});
  }

  // Live updates: append only new points; if baseline changes, update full series
  useEffect(() => {
    if (series.length === 0 || !hasInitialData.current) return;

    if (prevBaselineRef.current !== baselineDistance) {
      // Baseline changed -> full update to recompute all gaps
      prevBaselineRef.current = baselineDistance;
      // Reset lastX cache too
      lastXBySeriesRef.current = series.reduce((acc: Record<string, number>, s: any) => {
        const last = s.data[s.data.length - 1];
        acc[s.name] = last ? last.x : -1;
        return acc;
      }, {});
      if (typeof window !== "undefined" && window.ApexCharts) {
        setTimeout(() => {
          try {
            window.ApexCharts.exec("gap-analysis-chart", "updateSeries", series, false);
          } catch (e) {
            console.error("Failed to update gap chart series:", e);
          }
        }, 0);
      }
      return;
    }

    const payload = series.map((s) => {
      const lastX = lastXBySeriesRef.current[s.name] ?? -1;
      const newPoints = s.data.filter((pt: any) => pt.x > lastX);
      return { data: newPoints.map((pt: any) => ({ x: pt.x, y: pt.y })) };
    });
    const hasAnyNew = payload.some((p) => p.data.length > 0);
    if (!hasAnyNew) return;

    series.forEach((s) => {
      const last = s.data[s.data.length - 1];
      if (last) lastXBySeriesRef.current[s.name] = last.x;
    });

    if (typeof window !== "undefined" && window.ApexCharts) {
      setTimeout(() => {
        try {
          window.ApexCharts.exec("gap-analysis-chart", "appendData", payload);
        } catch (e) {
          console.error("Failed to append gap data:", e);
        }
      }, 0);
    }
  }, [series, baselineDistance]);

  // Handle time range button clicks
  const handleTimeRange = (hours: number) => {
    setViewHours(hours);
    if (typeof window === "undefined" || !window.ApexCharts) return;

    if (hours === 24) {
      // Reset to full view
      window.ApexCharts.exec("gap-analysis-chart", "zoomX", 0, 86400000);
    } else if (raceStartTime && followLive) {
      // Will be handled by the followLive effect
      return;
    } else {
      // Zoom to specified hours from start
      window.ApexCharts.exec(
        "gap-analysis-chart",
        "zoomX",
        0,
        hours * 3600 * 1000
      );
    }
  };

  // ApexCharts options - memoized to prevent chart recreation
  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        id: "gap-analysis-chart",
        type: "line",
        height: 500,
        zoom: {
          enabled: true,
          type: "x",
          autoScaleYaxis: true,
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
          autoSelected: "pan",
        },
        animations: {
          enabled: false,
        },
        events: {
          beforeZoom: (_ctx: any, { xaxis }: any) => {
            const min = Math.max(0, xaxis?.min ?? 0);
            const rangeMs = (xaxis?.max ?? min) - min;
            labelGranularityRef.current = rangeMs <= 6 * 3600000 ? "half" : "hour";
            return { xaxis: { min, max: xaxis?.max } };
          },
          scrolled: (_ctx: any, { xaxis }: any) => {
            const min = Math.max(0, xaxis?.min ?? 0);
            const rangeMs = (xaxis?.max ?? min) - min;
            labelGranularityRef.current = rangeMs <= 6 * 3600000 ? "half" : "hour";
          },
        } as any,
        pan: {
          enabled: true,
          mode: "x",
        },
      } as any, // Type assertion needed for pan property
      theme: {
        mode: theme === "dark" ? "dark" : "light",
      },
      stroke: {
        width: 2,
        curve: "smooth",
      },
      xaxis: {
        type: "numeric",
        min: 0,
        tickAmount: 97,
        labels: {
          formatter: (val) => {
            const value = Number(val);
            const totalMinutes = Math.round(value / 60000);
            const minutes = totalMinutes % 60;
            const hours = Math.floor(totalMinutes / 60);
            const mode = labelGranularityRef.current;
            const show = mode === "half" ? minutes % 30 === 0 : minutes % 60 === 0;
            return show ? `${hours}:${minutes.toString().padStart(2, "0")}` : "";
          },
        },
        title: {
          text: "Race Time",
        },
      },
      yaxis: {
        title: {
          text: `Gap from ${baselineDistance.toFixed(0)}km baseline (km)`,
        },
        labels: {
          formatter: (value) => value.toFixed(0),
        },
      },
      tooltip: {
        shared: false,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series[seriesIndex].data[dataPointIndex];
          const runnerName = w.config.series[seriesIndex].name;
          const time = point.x / 1000;
          const hours = Math.floor(time / 3600);
          const minutes = Math.floor((time % 3600) / 60);
          const gap = point.y;
          const status = gap >= 0 ? "ahead" : "behind";
          const absGap = Math.abs(gap);

          return `
          <div class="apexcharts-tooltip-custom" style="padding: 10px; background: ${
            theme === "dark" ? "#1f2937" : "#ffffff"
          }; border: 1px solid ${
            theme === "dark" ? "#374151" : "#e5e7eb"
          }; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${
              theme === "dark" ? "#374151" : "#e5e7eb"
            };">
              Time: ${hours}h ${minutes}m
            </div>
            <div style="margin-bottom: 4px; font-size: 12px; color: ${
              theme === "dark" ? "#9ca3af" : "#6b7280"
            };">
              Baseline: ${baselineDistance.toFixed(2)} km
            </div>
            <div style="color: ${
              w.config.series[seriesIndex].color ||
              w.globals.colors[seriesIndex]
            }; margin-bottom: 4px;">
              ${runnerName}
            </div>
            <div style="color: ${gap >= 0 ? "#10b981" : "#ef4444"};">
              ${gap >= 0 ? "+" : "-"}${absGap.toFixed(2)} km ${status}
            </div>
          </div>
        `;
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "center",
      },
      grid: {
        borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
      annotations: {
        xaxis: Array.from({ length: 25 }, (_v, hour) => ({
          x: hour * 3600000,
          strokeDashArray: hour % 6 === 0 ? 0 : 4,
          borderColor: theme === "dark" ? "#4b5563" : "#9ca3af",
          opacity: hour % 6 === 0 ? 0.75 : 0.25,
          label: { show: false },
        })),
        yaxis: [
          {
            y: 0,
            strokeDashArray: 5,
            borderColor: "#fbbf24",
            borderWidth: 3,
            opacity: 1,
            label: {
              text: `Baseline (${baselineDistance.toFixed(0)}km)`,
              position: "left",
              style: {
                color: "#fbbf24",
                background: "transparent",
                fontSize: "12px",
                fontWeight: "bold",
              },
            },
          },
        ],
      },
    }),
    [theme, baselineDistance]
  ); // Only recreate when theme or baseline changes

  if (bibs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.live?.gapAnalysis || "Gap Analysis"}</CardTitle>
          <CardDescription>
            {t.live?.selectRunnersDesc ||
              "Select runners to view their progress"}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
          {t.live?.noRunnersSelected || "No runners selected"}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.live?.gapAnalysis || "Gap Analysis"}</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              {t.live?.loadingChartData || "Loading..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
            <div>
              <CardTitle>{t.live?.gapAnalysis || "Gap Analysis"}</CardTitle>
              <CardDescription>
                {t.live?.gapAnalysisDesc ||
                `Gap from baseline. Use the toolbar to zoom, pan, and reset.`}
              </CardDescription>
          </div>

          {/* Baseline Controls */}
          <div className="flex flex-col sm:flex-row gap-4 border rounded-lg p-4 bg-muted/20">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">
                {t.live?.baselineMode || "Baseline Mode"}
              </Label>
              <Select
                value={baselineMode}
                onValueChange={(v: "manual" | "wr") => setBaselineMode(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wr">
                    {t.live?.worldRecord || "World Record"}
                  </SelectItem>
                  <SelectItem value="manual">
                    {t.live?.manualDistance || "Manual Distance"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {baselineMode === "wr" ? (
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">
                  {t.common?.gender || "Gender"}
                </Label>
                <Select
                  value={wrGender}
                  onValueChange={(v: "men" | "women") => setWrGender(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="men">
                      {t.common?.men || "Men"} ({WORLD_RECORDS.men.toFixed(2)}{" "}
                      km)
                    </SelectItem>
                    <SelectItem value="women">
                      {t.common?.women || "Women"} (
                      {WORLD_RECORDS.women.toFixed(2)} km)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">
                  {t.live?.baselineDistance || "Baseline Distance (km)"}
                </Label>
                <Input
                  type="number"
                  value={manualDistance}
                  onChange={(e) => setManualDistance(e.target.value)}
                  min="0"
                  max="400"
                  step="0.1"
                  placeholder="250"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          {initialSeriesRef.current.length > 0 ? (
            <Chart
              options={options}
              series={initialSeriesRef.current}
              type="line"
              height="100%"
              width="100%"
            />
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">
                {loading
                  ? t.live?.loadingChartData || "Loading..."
                  : "No data available"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

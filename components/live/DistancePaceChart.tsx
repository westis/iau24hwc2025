"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface DistancePaceChartProps {
  bibs: number[];
}

// Format pace from seconds/km to mm:ss/km
function formatPace(paceSec: number): string {
  if (!paceSec || paceSec <= 0) return "-";
  const minutes = Math.floor(paceSec / 60);
  const seconds = Math.floor(paceSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DistancePaceChart({ bibs }: DistancePaceChartProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialData = useRef(false);
  const initialSeriesRef = useRef<any[]>([]);
  const lastXBySeriesRef = useRef<Record<string, number>>({});
  const labelGranularityRef = useRef<"hour" | "half">("hour");

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
        console.error("Failed to fetch chart data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [bibs]);

  // Transform data to ApexCharts series format
  // Use useMemo to prevent unnecessary recalculations that could trigger re-renders
  const series = useMemo(
    () =>
      data?.runners
        .sort((a, b) => a.bib - b.bib) // Stable order required for appendData
        .map((runner) => ({
          name: `#${runner.bib} ${runner.name}`,
          data: runner.data.map((point) => ({
            x: point.time * 1000, // Convert to milliseconds for ApexCharts
            y: point.projectedKm,
            pace: point.avgPace,
          })),
          color: runner.color,
        })) || [],
    [data]
  );

  // Freeze initial series for Chart prop to prevent remounts/resets
  if (!hasInitialData.current && series.length > 0) {
    initialSeriesRef.current = series;
    hasInitialData.current = true;
    // Initialize last seen x per series
    lastXBySeriesRef.current = series.reduce(
      (acc: Record<string, number>, s: any) => {
        const last = s.data[s.data.length - 1];
        acc[s.name] = last ? last.x : -1;
        return acc;
      },
      {}
    );
  }

  // Update series imperatively to preserve zoom/pan (using chart ID, not ref!)
  useEffect(() => {
    if (series.length === 0 || !hasInitialData.current) return;

    // Build append payload with only new points per series (preserves zoom)
    const payload = series.map((s) => {
      const lastX = lastXBySeriesRef.current[s.name] ?? -1;
      const newPoints = s.data.filter((pt: any) => pt.x > lastX);
      return { data: newPoints.map((pt: any) => ({ x: pt.x, y: pt.y })) };
    });

    const hasAnyNew = payload.some((p) => p.data.length > 0);
    if (!hasAnyNew) return;

    // Update lastX cache
    series.forEach((s) => {
      const last = s.data[s.data.length - 1];
      if (last) lastXBySeriesRef.current[s.name] = last.x;
    });

    if (typeof window !== "undefined" && window.ApexCharts) {
      setTimeout(() => {
        try {
          window.ApexCharts.exec("distance-pace-chart", "appendData", payload);
        } catch (error) {
          console.error("Failed to append data to chart:", error);
        }
      }, 0);
    }
  }, [series]);

  // ApexCharts options - memoized to prevent chart recreation
  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        id: "distance-pace-chart",
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
          enabled: false, // Disable for better performance with live updates
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        events: {
          // Prevent zoom/pan from going before 0
          beforeZoom: (_chartContext: any, { xaxis }: any) => {
            const min = Math.max(0, xaxis?.min ?? 0);
            // Switch label granularity based on visible range
            const rangeMs = (xaxis?.max ?? min) - min;
            // Use half-hour labels if zoomed in to under 6 hours, else hourly
            labelGranularityRef.current = rangeMs <= 6 * 3600000 ? "half" : "hour";
            return { xaxis: { min, max: xaxis?.max } };
          },
          scrolled: (_chartContext: any, { xaxis }: any) => {
            // Update labels when user pans via wheel or drag
            const min = Math.max(0, xaxis?.min ?? 0);
            const rangeMs = (xaxis?.max ?? min) - min;
            labelGranularityRef.current = rangeMs <= 6 * 3600000 ? "half" : "hour";
          },
        } as any,
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
        // Dense ticks; labels formatter will hide those we don't want
        tickAmount: 97,
        labels: {
          formatter: (val) => {
            const value = Number(val);
            const totalMinutes = Math.round(value / 60000);
            const minutes = totalMinutes % 60;
            const hours = Math.floor(totalMinutes / 60);
            const mode = labelGranularityRef.current;
            // Show either hourly or half-hour marks depending on zoom level
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
          text: "Projected Distance (km)",
        },
        labels: {
          formatter: (value) => Math.round(value).toString(),
        },
      },
      tooltip: {
        shared: false,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series[seriesIndex].data[dataPointIndex];
          const runnerName = w.config.series[seriesIndex].name;
          const seriesColor =
            w.config.series[seriesIndex].color || w.globals.colors[seriesIndex];
          const time = point.x / 1000; // Convert back to seconds
          const hours = Math.floor(time / 3600);
          const minutes = Math.floor((time % 3600) / 60);
          const pace = point.pace;

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
            <div style="color: ${seriesColor}; margin-bottom: 4px;">
              ${runnerName}
            </div>
            <div>Projected: ${point.y.toFixed(2)} km</div>
            <div>Pace: ${formatPace(pace)}</div>
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
            show: false, // Hide default gridlines; we'll draw hourly via annotations
          },
        },
      },
      annotations: {
        xaxis: Array.from({ length: 25 }, (_v, hour) => ({
          x: hour * 3600000,
          strokeDashArray: hour % 6 === 0 ? 0 : 4,
          borderColor: theme === "dark" ? "#4b5563" : "#9ca3af",
          opacity: hour % 6 === 0 ? 0.75 : 0.25,
          // Using label as invisible helps ensure alignment without clutter
          label: {
            show: false,
          },
        })),
      },
    }),
    [theme]
  ); // Only recreate options when theme changes

  if (bibs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.live?.distanceOverTime || "Distance & Pace"}</CardTitle>
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
          <CardTitle>{t.live?.distanceOverTime || "Distance & Pace"}</CardTitle>
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
        <CardTitle>
          {t.live?.distanceAndPace || "Distance & Pace Analysis"}
        </CardTitle>
        <CardDescription>
          {t.live?.distanceAndPaceDesc ||
            "Projected distance over race time. Use the toolbar above the chart to zoom, pan, and reset the view."}
        </CardDescription>
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

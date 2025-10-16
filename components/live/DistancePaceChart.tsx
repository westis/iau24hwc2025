"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ChartDataResponse } from "@/types/live-race";
import dynamic from "next/dynamic";
import type { ChartOptions } from "chart.js";

// Dynamic import to avoid SSR issues with Chart.js and hammerjs
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

// Import and register Chart.js components only on client side
let ChartJS: any;
let chartRegistered = false;

if (typeof window !== "undefined") {
  import("chart.js").then((mod) => {
    ChartJS = mod.Chart;
    mod.Chart.register(
      mod.CategoryScale,
      mod.LinearScale,
      mod.PointElement,
      mod.LineElement,
      mod.Tooltip,
      mod.Legend
    );
  });

  import("chartjs-plugin-zoom").then((mod) => {
    if (ChartJS && !chartRegistered) {
      ChartJS.register(mod.default);
      chartRegistered = true;
    }
  });
}

interface DistancePaceChartProps {
  bibs: number[];
}

interface ChartDataPoint {
  x: number;
  y: number;
}

const TIME_RANGES = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
];

export function DistancePaceChart({ bibs }: DistancePaceChartProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<any>(null);
  const lastTimestampByBib = useRef<Record<number, number>>({});
  const prevBibs = useRef<string>("");

  // Fetch data with auto-refresh
  useEffect(() => {
    if (bibs.length === 0) {
      setLoading(false);
      setData(null);
      return;
    }

    async function fetchData(isInitial: boolean = false) {
      if (isInitial) setLoading(true);
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
        if (isInitial) setLoading(false);
      }
    }

    fetchData(true);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [bibs]);

  // Get max time from data for time range buttons
  const maxTime = useMemo(() => {
    if (!data?.runners.length) return 24 * 3600 * 1000;
    const allTimes = data.runners.flatMap((r) =>
      r.data.map((p) => p.time * 1000)
    );
    return Math.max(...allTimes, 0);
  }, [data]);

  // Handle time range button clicks
  const handleTimeRange = (hours: number | null) => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    if (hours === null) {
      // Reset to auto-scaled data range
      chart.resetZoom();
    } else if (hours === 24) {
      // Show full 24 hours explicitly
      if (chart.options.scales?.x) {
        chart.options.scales.x.min = 0;
        chart.options.scales.x.max = 24 * 3600 * 1000;
        chart.update("none");
      }
    } else {
      // Zoom to time range (last X hours of data)
      const rangeMs = hours * 3600 * 1000;
      const min = Math.max(0, maxTime - rangeMs);
      const max = Math.min(24 * 3600 * 1000, maxTime + 600000); // Add 10 min buffer
      if (chart.options.scales?.x) {
        chart.options.scales.x.min = min;
        chart.options.scales.x.max = max;
        chart.update("none");
      }
    }
  };

  // Update chart data when new data arrives
  useEffect(() => {
    if (!data || !chartRef.current) return;

    const chart = chartRef.current;
    const currentBibsKey = bibs.sort().join(",");

    // If runner selection changed, do full rebuild
    if (prevBibs.current !== currentBibsKey) {
      console.log("Runner selection changed, rebuilding chart");
      prevBibs.current = currentBibsKey;
      lastTimestampByBib.current = {};

      // Full dataset replacement
      chart.data.datasets = data.runners
        .sort((a, b) => a.bib - b.bib)
        .map((runner) => ({
          label: `#${runner.bib} ${runner.name}`,
          data: runner.data.map((point) => ({
            x: point.time * 1000,
            y: point.projectedKm,
          })),
          borderColor: runner.color,
          backgroundColor: runner.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        }));

      // Update last timestamps
      data.runners.forEach((runner) => {
        const lastPoint = runner.data[runner.data.length - 1];
        if (lastPoint) {
          lastTimestampByBib.current[runner.bib] = lastPoint.time * 1000;
        }
      });

      chart.update("none");
      return;
    }

    // Append only new data points
    let hasNewData = false;
    data.runners.forEach((runner, idx) => {
      const lastKnownTime = lastTimestampByBib.current[runner.bib] || -1;
      const newPoints = runner.data
        .filter((p) => p.time * 1000 > lastKnownTime)
        .map((p) => ({ x: p.time * 1000, y: p.projectedKm }));

      if (newPoints.length > 0) {
        hasNewData = true;
        const dataset = chart.data.datasets[idx];
        if (dataset) {
          (dataset.data as ChartDataPoint[]).push(...newPoints);
          const lastPoint = runner.data[runner.data.length - 1];
          if (lastPoint) {
            lastTimestampByBib.current[runner.bib] = lastPoint.time * 1000;
          }
        }
      }
    });

    if (hasNewData) {
      console.log("Appending new data to chart");
      chart.update("none"); // Preserve zoom/pan
    }
  }, [data, bibs]);

  // Update theme colors
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#111827";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    if (chart.options.scales?.x && chart.options.scales?.y) {
      // Update x-axis colors
      if (chart.options.scales.x.ticks) {
        chart.options.scales.x.ticks.color = textColor;
      }
      if (chart.options.scales.x.title) {
        chart.options.scales.x.title.color = textColor;
      }
      if (chart.options.scales.x.grid) {
        chart.options.scales.x.grid.color = gridColor;
      }

      // Update y-axis colors
      if (chart.options.scales.y.ticks) {
        chart.options.scales.y.ticks.color = textColor;
      }
      if (chart.options.scales.y.title) {
        chart.options.scales.y.title.color = textColor;
      }
      if (chart.options.scales.y.grid) {
        chart.options.scales.y.grid.color = gridColor;
      }

      // Update legend colors
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      chart.update("none");
    }
  }, [theme]);

  // Chart configuration
  const chartData = useMemo(() => {
    if (!data) {
      return { datasets: [] };
    }

    return {
      datasets: data.runners
        .sort((a, b) => a.bib - b.bib)
        .map((runner) => ({
          label: `#${runner.bib} ${runner.name}`,
          data: runner.data.map((point) => ({
            x: point.time * 1000,
            y: point.projectedKm,
          })),
          borderColor: runner.color,
          backgroundColor: runner.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        })),
    };
  }, [data]);

  const chartOptions: ChartOptions<"line"> = useMemo(() => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#111827";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 15,
          },
        },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
          callbacks: {
            title: (context) => {
              const time = context[0]?.parsed?.x;
              if (!time) return "";
              const hours = Math.floor(time / 3600000);
              const minutes = Math.floor((time % 3600000) / 60000);
              const seconds = Math.floor((time % 60000) / 1000);
              return `${hours}h ${minutes}m ${seconds}s`;
            },
            label: (context) => {
              const label = context.dataset.label || "";
              const distance = context.parsed.y?.toFixed(2) || "0";
              return `${label}: ${distance} km`;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "x",
          },
          limits: {
            x: { min: 0, max: 24 * 3600 * 1000 },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 24 * 3600 * 1000, // Hard limit: 0-24 hours
          title: {
            display: true,
            text: t.live?.raceTime || "Race Time",
            color: textColor,
          },
          ticks: {
            color: textColor,
            callback: (value, index, ticks) => {
              // Calculate label interval based on current range
              const min = ticks[0]?.value || 0;
              const max = ticks[ticks.length - 1]?.value || 24 * 3600 * 1000;
              const rangeHours = (max - min) / 3600000;

              let labelIntervalMs: number;
              if (rangeHours <= 3) {
                labelIntervalMs = 1800000; // 30 minutes
              } else if (rangeHours <= 6) {
                labelIntervalMs = 3600000; // 1 hour
              } else if (rangeHours <= 12) {
                labelIntervalMs = 7200000; // 2 hours
              } else {
                labelIntervalMs = 10800000; // 3 hours
              }

              // Only show label if it matches our label interval
              const val = Number(value);
              if (val % labelIntervalMs !== 0) {
                return "";
              }

              // Convert milliseconds to hours:minutes
              const totalSeconds = val / 1000;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              return `${hours}:${minutes.toString().padStart(2, "0")}`;
            },
            maxRotation: 0,
            autoSkip: false,
          },
          afterBuildTicks: (axis: any) => {
            const min = axis.min || 0;
            const max = axis.max || 24 * 3600 * 1000;

            // Always generate ticks for every hour (for gridlines)
            const hourMs = 3600000;
            const startHour = Math.ceil(min / hourMs) * hourMs;

            const ticks = [];
            for (let value = startHour; value <= max; value += hourMs) {
              ticks.push({ value });
            }

            axis.ticks = ticks;
          },
          grid: {
            color: (context) => {
              if (!context.tick) return gridColor;
              const hours = context.tick.value / 3600000;
              // Darker line every 6 hours
              return hours % 6 === 0
                ? theme === "dark"
                  ? "#6b7280"
                  : "#9ca3af"
                : gridColor;
            },
            lineWidth: (context) => {
              if (!context.tick) return 1;
              const hours = context.tick.value / 3600000;
              // Thicker line every 6 hours
              return hours % 6 === 0 ? 2 : 1;
            },
          },
        },
        y: {
          title: {
            display: true,
            text: t.live?.projectedDistance || "Projected Distance (km)",
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: gridColor,
          },
        },
      },
    };
  }, [theme, t]);

  if (bibs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.live?.distanceAndPace || "Distance & Pace"}</CardTitle>
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
          <CardTitle>{t.live?.distanceAndPace || "Distance & Pace"}</CardTitle>
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
            "Projected distance over race time. Use mouse wheel to zoom, drag to pan."}
        </CardDescription>

        {/* Time Range Buttons */}
        <div className="flex flex-wrap gap-2 pt-4">
          <span className="text-sm font-medium text-muted-foreground self-center">
            {t.live?.timeRange || "Time Range"}:
          </span>
          {TIME_RANGES.map((range) => (
            <Button
              key={range.hours}
              size="sm"
              variant="outline"
              onClick={() => handleTimeRange(range.hours)}
            >
              {range.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTimeRange(null)}
          >
            {t.live?.reset || "Reset"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          {chartData.datasets.length > 0 ? (
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">
                {t.live?.noData || "No data available"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

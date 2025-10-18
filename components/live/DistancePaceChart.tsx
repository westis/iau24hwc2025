"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
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

// Chart.js will be registered in useEffect to ensure proper initialization order

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

function DistancePaceChartComponent({ bibs }: DistancePaceChartProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const chartRef = useRef<any>(null);
  const prevBibs = useRef<string>("");
  const lastDataUpdate = useRef<number>(0);

  // Register Chart.js components before rendering
  useEffect(() => {
    let mounted = true;

    async function registerChartJS() {
      try {
        const chartModule = await import("chart.js");
        chartModule.Chart.register(
          chartModule.CategoryScale,
          chartModule.LinearScale,
          chartModule.PointElement,
          chartModule.LineElement,
          chartModule.Tooltip,
          chartModule.Legend,
          chartModule.TimeScale
        );

        const zoomPlugin = await import("chartjs-plugin-zoom");
        chartModule.Chart.register(zoomPlugin.default);

        if (mounted) {
          console.log("[DistancePaceChart] Chart.js registered successfully");
          setChartReady(true);
        }
      } catch (error) {
        console.error("[DistancePaceChart] Failed to register Chart.js:", error);
      }
    }

    registerChartJS();

    return () => {
      mounted = false;
    };
  }, []);

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
        console.log("[DistancePaceChart] Fetching data:", url);
        const res = await fetch(url);
        const result = await res.json();
        console.log("[DistancePaceChart] Data fetched:", result.runners?.length, "runners");
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
      // Reset to show all available data (same as default)
      const dataMax = maxTime > 0 ? Math.min(maxTime + 600000, 24 * 3600 * 1000) : 24 * 3600 * 1000;
      if (chart.options.scales?.x) {
        chart.options.scales.x.min = 0;
        chart.options.scales.x.max = dataMax;
        chart.update("none");
      }
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

  // Calculate moving average trendline for a runner
  const calculateTrendline = (runnerData: any[]) => {
    if (runnerData.length < 2) return null;

    // Get the most recent data point
    const latestPoint = runnerData[runnerData.length - 1];
    const latestTime = latestPoint.time * 1000; // Convert to ms
    const latestDistance = latestPoint.projectedKm;

    // Adaptive window: 20% of elapsed time, min 3h, max 6h
    const elapsedHours = latestTime / 3600000;
    const windowHours = Math.max(3, Math.min(6, elapsedHours * 0.2));

    // Filter to points within the moving average window (last X hours)
    const windowMs = windowHours * 3600 * 1000;
    const windowStart = latestTime - windowMs;
    const recentPoints = runnerData.filter(p => p.time * 1000 >= windowStart);

    if (recentPoints.length < 2) return null;

    // Calculate average pace from recent points (km per ms)
    const firstRecent = recentPoints[0];
    const timeElapsed = (latestPoint.time - firstRecent.time) * 1000; // ms
    const distanceGained = latestPoint.projectedKm - firstRecent.projectedKm;
    const pace = distanceGained / timeElapsed; // km per ms

    // Project trendline from current position to 24 hours
    const endTime = 24 * 3600 * 1000; // 24 hours in ms
    const timeRemaining = endTime - latestTime;
    const projectedEndDistance = latestDistance + (pace * timeRemaining);

    return {
      startPoint: { x: latestTime, y: latestDistance },
      endPoint: { x: endTime, y: projectedEndDistance },
      pace: pace * 3600000, // Convert to km/hour for display
    };
  };

  // Update chart when data changes (PUSH MODEL: append data + update('quiet'))
  useEffect(() => {
    if (!data || !chartRef.current) {
      return;
    }

    const chart = chartRef.current;
    // Don't mutate bibs array! Create sorted copy
    const currentBibsKey = [...bibs].sort((a, b) => a - b).join(",");
    const bibsChanged = prevBibs.current !== currentBibsKey;

    console.log("[DistancePaceChart] useEffect - checking for changes", {
      currentBibsKey,
      prevBibsKey: prevBibs.current,
      bibsChanged,
      datasetCount: chart.data.datasets.length
    });

    // Full rebuild when bibs change
    if (bibsChanged || chart.data.datasets.length === 0) {
      console.log("[DistancePaceChart] Bibs changed or initial load - rebuilding datasets");
      prevBibs.current = currentBibsKey;

      const sortedRunners = [...data.runners].sort((a, b) => a.bib - b.bib);

      // Create main data datasets
      const mainDatasets = sortedRunners.map((runner) => ({
        label: `#${runner.bib} ${runner.name}`,
        data: runner.data.map((point) => ({
          x: point.time * 1000,
          y: point.projectedKm,
        })),
        borderColor: runner.color,
        backgroundColor: runner.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      }));

      // Create trendline datasets
      const trendlineDatasets = sortedRunners.map((runner) => {
        const trendline = calculateTrendline(runner.data);
        if (!trendline) return null;

        return {
          label: `#${runner.bib} trend`,
          data: [trendline.startPoint, trendline.endPoint],
          borderColor: runner.color,
          backgroundColor: runner.color,
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0,
          opacity: 0.5,
        };
      }).filter(Boolean); // Remove nulls

      // Combine main datasets + trendlines
      chart.data.datasets = [...mainDatasets, ...trendlineDatasets] as any;

      chart.update('quiet'); // Use 'quiet' mode - updates without redraw
      lastDataUpdate.current = Date.now();
      return;
    }

    // Incremental update: replace data points via ref
    if (chart.data.datasets.length > 0 && data.runners.length > 0) {
      console.log("[DistancePaceChart] Appending/updating data points (quiet mode)");

      const sortedRunners = [...data.runners].sort((a, b) => a.bib - b.bib);
      const numRunners = sortedRunners.length;

      // Update main datasets (first N datasets are main data)
      sortedRunners.forEach((runner, idx) => {
        const dataset = chart.data.datasets[idx];
        if (dataset) {
          dataset.data = runner.data.map((point) => ({
            x: point.time * 1000,
            y: point.projectedKm,
          }));
        }
      });

      // Update trendline datasets (next N datasets are trendlines)
      sortedRunners.forEach((runner, idx) => {
        const trendlineIdx = numRunners + idx;
        const trendlineDataset = chart.data.datasets[trendlineIdx];
        if (trendlineDataset) {
          const trendline = calculateTrendline(runner.data);
          if (trendline) {
            trendlineDataset.data = [trendline.startPoint, trendline.endPoint];
          }
        }
      });

      chart.update('quiet'); // 'quiet' mode = no animation, no full redraw
      lastDataUpdate.current = Date.now();
    }
  }, [data, bibs]);

  // Update X-axis max when data range changes
  useEffect(() => {
    if (!chartRef.current || maxTime === 0) return;
    const chart = chartRef.current;

    if (chart.options.scales?.x) {
      const dataMax = Math.min(maxTime + 600000, 24 * 3600 * 1000);
      // Only update if not manually zoomed/panned
      // Check if current max is close to previous data max (within 15 minutes)
      const currentMax = chart.options.scales.x.max as number;
      if (Math.abs(currentMax - dataMax) < 900000 || currentMax < dataMax) {
        chart.options.scales.x.max = dataMax;
        chart.update("none");
      }
    }
  }, [maxTime]);

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

  // Chart data - keep empty, all updates via ref
  const chartData = useMemo(() => {
    console.log("[DistancePaceChart] chartData object created (empty, stable)");
    return { datasets: [] };
  }, []); // Never rebuild - stable empty object

  const chartOptions: ChartOptions<"line"> = useMemo(() => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#111827";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    // Use actual data range, or default to 24h if no data yet
    const dataMax = maxTime > 0 ? Math.min(maxTime + 600000, 24 * 3600 * 1000) : 24 * 3600 * 1000;

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
          max: dataMax, // Show available data range by default
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
  }, [theme, t, maxTime]); // Include maxTime to update initial view range

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

  if (!chartReady || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.live?.distanceAndPace || "Distance & Pace"}</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              {!chartReady
                ? "Initializing chart..."
                : t.live?.loadingChartData || "Loading..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log("[DistancePaceChart] COMPONENT RENDER", {
    chartReady,
    loading,
    hasData: !!data,
    numRunners: data?.runners?.length,
    chartDatasets: chartData.datasets.length,
    chartRefDatasets: chartRef.current?.data?.datasets?.length || 0,
    bibs: bibs,
    timestamp: Date.now()
  });

  // Check if chart has data but it's not showing
  if (chartReady && !loading && chartRef.current) {
    const chart = chartRef.current;
    console.log("[DistancePaceChart] Chart instance state:", {
      datasetsInChart: chart.data?.datasets?.length,
      datasetsInProp: chartData.datasets.length,
      firstDatasetPoints: chart.data?.datasets?.[0]?.data?.length || 0
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t.live?.distanceAndPace || "Distance & Pace Analysis"}
        </CardTitle>
        <CardDescription>
          {t.live?.distanceAndPaceDesc ||
            "Projected distance over race time. Dashed lines show expected 24h finish based on recent pace (average of last 3-6 hours). Use mouse wheel to zoom, drag to pan."}
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
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
}

// Wrap in memo to prevent rerenders when parent updates but bibs haven't changed
export const DistancePaceChart = memo(DistancePaceChartComponent, (prevProps, nextProps) => {
  // React.memo: return TRUE if props are equal (skip rerender), FALSE if different (do rerender)
  const areEqual = prevProps.bibs.length === nextProps.bibs.length &&
                   prevProps.bibs.every((bib, i) => bib === nextProps.bibs[i]);

  console.log("[DistancePaceChart] memo comparison:", {
    prevBibs: prevProps.bibs,
    nextBibs: nextProps.bibs,
    areEqual,
    willRerender: !areEqual
  });

  return areEqual;
});

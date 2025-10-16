// app/api/race/chart-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ChartDataResponse,
  RunnerChartData,
  ChartDataPoint,
} from "@/types/live-race";

// Color palette for runners
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const bibsParam = searchParams.get("bibs"); // Comma-separated bib numbers
    const timeRange = searchParams.get("range") || "24h"; // 6h, 12h, 24h

    if (!bibsParam) {
      return NextResponse.json(
        { error: "Missing bibs parameter" },
        { status: 400 }
      );
    }

    const bibs = bibsParam
      .split(",")
      .map((b) => parseInt(b.trim()))
      .filter((b) => !isNaN(b));

    if (bibs.length === 0) {
      return NextResponse.json(
        { error: "No valid bib numbers provided" },
        { status: 400 }
      );
    }

    // Get active race
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("id, start_date")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      return NextResponse.json(
        { error: "No active race found" },
        { status: 404 }
      );
    }

    // Calculate time cutoff based on range
    const now = new Date();
    const startTime = new Date(activeRace.start_date);
    let cutoffTime: Date;

    switch (timeRange) {
      case "6h":
        cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "12h":
        cutoffTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = startTime;
    }

    // Fetch lap data for selected runners
    const runnersData: RunnerChartData[] = [];

    for (let i = 0; i < bibs.length; i++) {
      const bib = bibs[i];

      // Get runner info
      const { data: runnerInfo } = await supabase
        .from("race_leaderboard")
        .select("name, country, gender")
        .eq("race_id", activeRace.id)
        .eq("bib", bib)
        .single();

      if (!runnerInfo) continue;

      // Get lap data
      const { data: laps } = await supabase
        .from("race_laps")
        .select("*")
        .eq("race_id", activeRace.id)
        .eq("bib", bib)
        .gte("timestamp", cutoffTime.toISOString())
        .order("lap", { ascending: true });

      if (!laps || laps.length === 0) continue;

      // Convert to chart data points
      const dataPoints: ChartDataPoint[] = laps.map((lap) => {
        const lapTime = new Date(lap.timestamp);
        const elapsedSeconds = Math.floor(
          (lapTime.getTime() - startTime.getTime()) / 1000
        );

        // Calculate projected distance (24h projection)
        const projectedKm =
          lap.avg_pace > 0
            ? ((86400 / lap.avg_pace) * lap.distance_km) / lap.race_time_sec
            : 0;

        return {
          time: elapsedSeconds,
          distanceKm: lap.distance_km,
          projectedKm: Number(projectedKm.toFixed(3)),
          avgPace: lap.avg_pace,
          bib: lap.bib,
        };
      });

      runnersData.push({
        bib,
        name: runnerInfo.name,
        country: runnerInfo.country,
        gender: runnerInfo.gender,
        color: COLORS[i % COLORS.length],
        data: dataPoints,
      });
    }

    const response: ChartDataResponse = {
      runners: runnersData,
      startTime: startTime.toISOString(),
      currentTime: now.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in chart data GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


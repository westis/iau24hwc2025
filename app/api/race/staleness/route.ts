// app/api/race/staleness/route.ts
// Check if race data is stale (hasn't been updated recently)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const STALE_THRESHOLD_MINUTES = parseInt(
  process.env.STALE_DATA_THRESHOLD_MINUTES || "5"
);

export async function GET() {
  try {
    const supabase = await createClient();

    // Get active race config
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      return NextResponse.json(
        { error: "No active race found" },
        { status: 404 }
      );
    }

    const { data: config } = await supabase
      .from("race_config")
      .select("race_state, last_data_fetch")
      .eq("race_id", activeRace.id)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: "Race config not found" },
        { status: 404 }
      );
    }

    // If race is not live, data freshness doesn't matter
    if (config.race_state !== "live") {
      return NextResponse.json({
        isStale: false,
        raceState: config.race_state,
        lastFetch: config.last_data_fetch,
        minutesSinceLastFetch: null,
        staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
        message: "Race is not currently live",
      });
    }

    // Check if we have a last fetch time
    if (!config.last_data_fetch) {
      return NextResponse.json({
        isStale: true,
        raceState: config.race_state,
        lastFetch: null,
        minutesSinceLastFetch: null,
        staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
        message: "No data has been fetched yet",
      });
    }

    // Calculate time since last fetch
    const lastFetchTime = new Date(config.last_data_fetch);
    const now = new Date();
    const minutesSinceLastFetch =
      (now.getTime() - lastFetchTime.getTime()) / 1000 / 60;

    const isStale = minutesSinceLastFetch > STALE_THRESHOLD_MINUTES;

    return NextResponse.json({
      isStale,
      raceState: config.race_state,
      lastFetch: config.last_data_fetch,
      minutesSinceLastFetch: Math.round(minutesSinceLastFetch * 10) / 10,
      staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
      message: isStale
        ? `Data is stale (last updated ${Math.round(
            minutesSinceLastFetch
          )} minutes ago)`
        : "Data is fresh",
    });
  } catch (error) {
    console.error("Error checking staleness:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

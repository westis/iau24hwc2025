// app/api/admin/monitoring/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get active race
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

    // Get race config with last_data_fetch
    const { data: config } = await supabase
      .from("race_config")
      .select("*")
      .eq("race_id", activeRace.id)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: "No race config found" },
        { status: 404 }
      );
    }

    // Get runner counts from leaderboard
    const { data: leaderboard } = await supabase
      .from("race_leaderboard")
      .select("*")
      .eq("race_id", activeRace.id);

    const runnerCount = leaderboard?.length || 0;

    // Calculate on track vs on break
    // Assume "on break" if projected_km significantly differs from distance_km
    // or use a status field if you have one
    const onTrackCount = leaderboard?.filter((r: any) => {
      // Simple heuristic: on track if last passing within reasonable time
      // You may want to adjust this logic based on your data structure
      return true; // Placeholder - adjust based on your break detection logic
    }).length || 0;

    const onBreakCount = runnerCount - onTrackCount;

    // Calculate time since last fetch
    const now = new Date();
    const lastFetch = config.last_data_fetch
      ? new Date(config.last_data_fetch)
      : null;
    const secondsSinceFetch = lastFetch
      ? Math.floor((now.getTime() - lastFetch.getTime()) / 1000)
      : Infinity;

    // Get data source from config or env
    const dataSource =
      config.data_source ||
      process.env.BREIZH_CHRONO_URL ||
      process.env.RACE_DATA_SOURCE_URL ||
      null;

    return NextResponse.json({
      raceState: config.race_state || "unknown",
      lastDataFetch: config.last_data_fetch || null,
      secondsSinceFetch,
      simulationMode: config.simulation_mode || false,
      runnerCount,
      onTrackCount,
      onBreakCount,
      dataSource,
    });
  } catch (error) {
    console.error("Error in monitoring GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

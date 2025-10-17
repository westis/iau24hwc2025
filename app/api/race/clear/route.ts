// app/api/race/clear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache } from "@/lib/live-race/cache";

/**
 * POST /api/race/clear
 *
 * DEPRECATED: Use /api/race/clear-simulation instead for safer data clearing.
 *
 * This endpoint clears ALL race data (laps, leaderboard) for the active race.
 * It should only be used during testing/simulation.
 *
 * SAFETY: Only works if simulation_mode is enabled. This prevents accidental
 * deletion of real race data.
 */
export async function POST(request: NextRequest) {
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

    // SAFETY CHECK: Only allow clearing if simulation mode is enabled
    const { data: config } = await supabase
      .from("race_config")
      .select("simulation_mode")
      .eq("race_id", activeRace.id)
      .single();

    if (config && !config.simulation_mode) {
      return NextResponse.json(
        {
          error:
            "Cannot clear data: Simulation mode is not enabled",
          safety:
            "This prevents accidental deletion of real race data. Enable simulation mode first or use /api/race/clear-simulation",
        },
        { status: 403 }
      );
    }

    // Clear race data
    await supabase.from("race_laps").delete().eq("race_id", activeRace.id);
    await supabase
      .from("race_leaderboard")
      .delete()
      .eq("race_id", activeRace.id);

    // Reset race state
    await supabase
      .from("race_config")
      .update({
        race_state: "not_started",
        last_data_fetch: null,
      })
      .eq("race_id", activeRace.id);

    // Clear all caches
    raceCache.clear();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing race data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





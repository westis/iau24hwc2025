// app/api/race/clear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache } from "@/lib/live-race/cache";

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



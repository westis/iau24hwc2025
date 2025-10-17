// app/api/race/update-leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache } from "@/lib/live-race/cache";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { leaderboard, raceId } = await request.json();

    if (!leaderboard || !Array.isArray(leaderboard)) {
      return NextResponse.json(
        { error: "Missing leaderboard data" },
        { status: 400 }
      );
    }

    // Delete existing leaderboard entries for this race
    await supabase.from("race_leaderboard").delete().eq("race_id", raceId);

    // Insert new leaderboard data (convert camelCase to snake_case)
    const leaderboardWithRaceId = leaderboard.map((entry) => ({
      race_id: raceId,
      bib: entry.bib,
      name: entry.name,
      gender: entry.gender,
      country: entry.country,
      rank: entry.rank,
      gender_rank: entry.genderRank,
      distance_km: entry.distanceKm,
      projected_km: entry.projectedKm,
      race_time_sec: entry.raceTimeSec,
      lap_pace_sec: entry.lapPaceSec,
      lap_time_sec: entry.lapTimeSec,
      lap: entry.lap,
      trend: entry.trend,
      last_passing: entry.lastPassing,
      timestamp: entry.timestamp,
    }));

    const { error: leaderboardError } = await supabase
      .from("race_leaderboard")
      .insert(leaderboardWithRaceId);

    if (leaderboardError) {
      console.error("Error updating leaderboard:", leaderboardError);
      return NextResponse.json(
        {
          error: "Failed to update leaderboard",
          details: leaderboardError.message,
        },
        { status: 500 }
      );
    }

    // Update race config timestamp
    await supabase
      .from("race_config")
      .update({
        last_data_fetch: new Date().toISOString(),
      })
      .eq("race_id", raceId);

    // Clear leaderboard cache
    raceCache.clearPattern("leaderboard:*");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in update-leaderboard:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





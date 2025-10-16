// app/api/race/insert-lap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache } from "@/lib/live-race/cache";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { lap, raceId } = await request.json();

    if (!lap) {
      return NextResponse.json({ error: "Missing lap data" }, { status: 400 });
    }

    // Insert lap data (convert camelCase to snake_case)
    const { error: lapError } = await supabase.from("race_laps").insert({
      race_id: raceId,
      bib: lap.bib,
      lap: lap.lap,
      lap_time_sec: lap.lapTimeSec,
      race_time_sec: lap.raceTimeSec,
      distance_km: lap.distanceKm,
      rank: lap.rank,
      gender_rank: lap.genderRank,
      age_group_rank: lap.ageGroupRank,
      lap_pace: lap.lapPace,
      avg_pace: lap.avgPace,
      timestamp: lap.timestamp,
    });

    if (lapError) {
      console.error("Error inserting lap:", lapError);
      return NextResponse.json(
        { error: "Failed to insert lap", details: lapError.message },
        { status: 500 }
      );
    }

    // Clear relevant caches
    raceCache.clearPattern("laps:*");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in insert-lap:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



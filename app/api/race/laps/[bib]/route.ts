// app/api/race/laps/[bib]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache, cacheKeys } from "@/lib/live-race/cache";
import type { LapTimesResponse } from "@/types/live-race";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bib: string }> }
) {
  try {
    const supabase = await createClient();
    const { bib } = await params;
    const bibNumber = parseInt(bib);

    if (isNaN(bibNumber)) {
      return NextResponse.json(
        { error: "Invalid bib number" },
        { status: 400 }
      );
    }

    // Check cache first (60 second TTL - laps don't change often)
    const cacheKey = cacheKeys.laps(bibNumber);
    const cached = raceCache.get<LapTimesResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

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

    // Get runner info from leaderboard
    const { data: runnerInfo } = await supabase
      .from("race_leaderboard")
      .select("name")
      .eq("race_id", activeRace.id)
      .eq("bib", bibNumber)
      .single();

    // Get lap times
    const { data: laps, error } = await supabase
      .from("race_laps")
      .select("*")
      .eq("race_id", activeRace.id)
      .eq("bib", bibNumber)
      .order("lap", { ascending: true });

    if (error) {
      console.error("Error fetching lap times:", error);
      return NextResponse.json(
        { error: "Failed to fetch lap times" },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase
    const formattedLaps = (laps || []).map((lap: any) => ({
      bib: lap.bib,
      lap: lap.lap,
      lapTimeSec: lap.lap_time_sec,
      raceTimeSec: lap.race_time_sec,
      distanceKm: lap.distance_km,
      rank: lap.rank,
      genderRank: lap.gender_rank,
      ageGroupRank: lap.age_group_rank,
      lapPace: lap.lap_pace,
      avgPace: lap.avg_pace,
      timestamp: lap.timestamp,
    }));

    const response: LapTimesResponse = {
      bib: bibNumber,
      name: runnerInfo?.name || `Runner ${bibNumber}`,
      laps: formattedLaps,
    };

    // Cache the response (60 seconds - laps don't change often)
    raceCache.set(cacheKey, response, 60);

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Error in lap times GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

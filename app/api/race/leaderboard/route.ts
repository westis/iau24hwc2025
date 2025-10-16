// app/api/race/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache, cacheKeys } from "@/lib/live-race/cache";
import type { LeaderboardResponse } from "@/types/live-race";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "overall"; // overall, men, women

    // Check cache first (30 second TTL) - don't cache watchlist as it's user-specific
    const cacheKey = cacheKeys.leaderboard(filter);
    const cached = raceCache.get<LeaderboardResponse>(cacheKey);
    
    if (cached && filter !== "watchlist") {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
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

    // Get race config for state
    const { data: config } = await supabase
      .from("race_config")
      .select("race_state, last_data_fetch")
      .eq("race_id", activeRace.id)
      .single();

    // Build query
    let query = supabase
      .from("race_leaderboard")
      .select("*")
      .eq("race_id", activeRace.id);

    // Apply gender filter
    if (filter === "men") {
      query = query.eq("gender", "m").order("gender_rank", { ascending: true });
    } else if (filter === "women") {
      query = query.eq("gender", "w").order("gender_rank", { ascending: true });
    } else {
      query = query.order("rank", { ascending: true });
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase
    const formattedEntries = (entries || []).map((entry: any) => ({
      bib: entry.bib,
      name: entry.name,
      rank: entry.rank,
      genderRank: entry.gender_rank,
      distanceKm: entry.distance_km,
      projectedKm: entry.projected_km,
      raceTimeSec: entry.race_time_sec,
      lapPaceSec: entry.lap_pace_sec,
      lapTimeSec: entry.lap_time_sec,
      lap: entry.lap,
      gender: entry.gender,
      timestamp: entry.timestamp,
      country: entry.country,
      trend: entry.trend,
      lastPassing: entry.last_passing,
    }));

    const response: LeaderboardResponse = {
      entries: formattedEntries,
      raceState: config?.race_state || "not_started",
      lastUpdate: config?.last_data_fetch || new Date().toISOString(),
      totalRunners: formattedEntries.length,
    };

    // Cache the response (30 seconds) - don't cache watchlist
    if (filter !== "watchlist") {
      raceCache.set(cacheKey, response, 30);
    }

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Error in leaderboard GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

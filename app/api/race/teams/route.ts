import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache, cacheKeys } from "@/lib/live-race/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender") || "m"; // "m" or "w"

    // Check cache first (30 second TTL)
    const cacheKey = cacheKeys.teams(gender);
    const cached = raceCache.get<any>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control":
            "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        },
      });
    }

    const supabase = await createClient();

    // Fetch current leaderboard filtered by gender
    const { data: entries, error } = await supabase
      .from("race_leaderboard")
      .select("*")
      .eq("gender", gender)
      .order("distance_km", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        teams: [],
        gender,
        lastUpdate: new Date().toISOString(),
      });
    }

    // Group by country
    const countryMap = new Map<string, typeof entries>();
    entries.forEach((entry) => {
      const country = entry.country;
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(entry);
    });

    // Calculate team totals (top 3 per country)
    const teams = Array.from(countryMap.entries()).map(([country, runners]) => {
      // Sort runners by distance (descending)
      const sortedRunners = [...runners].sort(
        (a, b) => b.distance_km - a.distance_km
      );

      // Sum top 3 distances
      const top3 = sortedRunners.slice(0, 3);
      const teamTotal = top3.reduce((sum, r) => sum + r.distance_km, 0);

      return {
        country,
        runners: sortedRunners.map((r) => ({
          bib: r.bib,
          name: r.name,
          rank: r.rank,
          genderRank: r.gender_rank,
          distanceKm: r.distance_km,
          projectedKm: r.projected_km,
          raceTimeSec: r.race_time_sec,
          lapPaceSec: r.lap_pace_sec,
          lapTimeSec: r.lap_time_sec,
          lap: r.lap,
          gender: r.gender,
          timestamp: r.timestamp,
          country: r.country,
          trend: r.trend,
          lastPassing: r.last_passing,
        })),
        teamTotal,
        runnerCount: sortedRunners.length,
      };
    });

    // Sort teams by total distance (descending)
    teams.sort((a, b) => b.teamTotal - a.teamTotal);

    const response = {
      teams,
      gender,
      lastUpdate: new Date().toISOString(),
      totalTeams: teams.length,
    };

    // Cache the response (30 seconds)
    raceCache.set(cacheKey, response, 30);

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control":
          "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error in teams endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

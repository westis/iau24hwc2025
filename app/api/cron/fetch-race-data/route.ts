// app/api/cron/fetch-race-data/route.ts
// Vercel Cron job endpoint to fetch and update race data
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BreizhChronoAdapter } from "@/lib/live-race/breizh-chrono-adapter";
import {
  calculateLapsFromLeaderboard,
  type LapCalculationConfig,
} from "@/lib/live-race/lap-calculator";
import type { LeaderboardEntry } from "@/types/live-race";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * This endpoint should be called by Vercel Cron
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/fetch-race-data",
 *     "schedule": "* * * * *"  // Every minute during race
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get active race and config
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
      .select("*")
      .eq("race_id", activeRace.id)
      .single();

    // Only fetch if race is live
    if (config?.race_state !== "live") {
      return NextResponse.json({
        message: "Race not live, skipping fetch",
        raceState: config?.race_state,
      });
    }

    // Get data source URL from config or env
    const dataSourceUrl =
      config?.data_source ||
      process.env.BREIZH_CHRONO_URL ||
      process.env.RACE_DATA_SOURCE_URL;

    if (!dataSourceUrl) {
      return NextResponse.json(
        { error: "No data source configured" },
        { status: 400 }
      );
    }

    // Use BreizhChrono adapter
    const adapter = new BreizhChronoAdapter(dataSourceUrl);

    // Fetch data
    let leaderboard: LeaderboardEntry[];
    let laps: any[] = [];

    try {
      leaderboard = await adapter.fetchLeaderboard();

      // Try to fetch lap data (may not be available)
      try {
        laps = await adapter.fetchLapData();
      } catch (lapError) {
        console.log("Lap data not available, will calculate from leaderboard");
      }
    } catch (fetchError) {
      console.error("Error fetching race data:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch race data",
          details: fetchError instanceof Error ? fetchError.message : "Unknown",
        },
        { status: 500 }
      );
    }

    // Get previous leaderboard for lap calculation
    const { data: previousLeaderboard } = await supabase
      .from("race_leaderboard")
      .select("*")
      .eq("race_id", activeRace.id);

    // If no lap data from source, calculate from distance increases
    if (laps.length === 0 && previousLeaderboard) {
      const lapConfig: LapCalculationConfig = {
        lapDistanceKm: parseFloat(process.env.LAP_DISTANCE || "1.5"),
        firstLapDistanceKm: parseFloat(
          process.env.FIRST_LAP_DISTANCE ||
            config?.first_lap_distance_km?.toString() ||
            "0.1"
        ),
        tolerancePercent: 10,
      };

      const calculatedLaps = await calculateLapsFromLeaderboard(
        leaderboard,
        previousLeaderboard as LeaderboardEntry[],
        lapConfig
      );

      laps = calculatedLaps;
    }

    // Match leaderboard entries with our runner database to get gender/country
    const { data: runners } = await supabase
      .from("runners")
      .select("bib, gender, nationality")
      .not("bib", "is", null);

    const runnerMap = new Map(
      runners?.map((r) => [r.bib, { gender: r.gender, country: r.nationality }])
    );

    // Enrich leaderboard with gender and country from database
    const enrichedLeaderboard = leaderboard.map((entry) => {
      const runner = runnerMap.get(entry.bib);
      return {
        ...entry,
        gender: runner?.gender?.toLowerCase() || "m",
        country: runner?.country || "XXX",
      };
    });

    // Calculate gender ranks
    const menLeaderboard = enrichedLeaderboard
      .filter((e) => e.gender === "m")
      .sort((a, b) => b.distanceKm - a.distanceKm);
    const womenLeaderboard = enrichedLeaderboard
      .filter((e) => e.gender === "w")
      .sort((a, b) => b.distanceKm - a.distanceKm);

    menLeaderboard.forEach((entry, index) => {
      entry.genderRank = index + 1;
    });
    womenLeaderboard.forEach((entry, index) => {
      entry.genderRank = index + 1;
    });

    // Update database with upsert strategy
    // Delete existing leaderboard
    await supabase
      .from("race_leaderboard")
      .delete()
      .eq("race_id", activeRace.id);

    // Insert new leaderboard data
    const leaderboardWithRaceId = enrichedLeaderboard.map((entry) => ({
      race_id: activeRace.id,
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
      last_known_distance_km: entry.distanceKm,
    }));

    const leaderboardResult = await supabase
      .from("race_leaderboard")
      .insert(leaderboardWithRaceId);

    // Insert new laps (use upsert to avoid duplicates)
    let lapsInserted = 0;
    if (laps.length > 0) {
      const lapsWithRaceId = laps.map((lap) => ({
        race_id: activeRace.id,
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
      }));

      // Use upsert based on unique constraint (race_id, bib, lap)
      const lapsResult = await supabase
        .from("race_laps")
        .upsert(lapsWithRaceId, {
          onConflict: "race_id,bib,lap",
          ignoreDuplicates: false,
        });

      if (lapsResult.error) {
        console.error("Laps insert error:", lapsResult.error);
      } else {
        lapsInserted = laps.length;
      }
    }

    if (leaderboardResult.error) {
      console.error("Leaderboard insert error:", leaderboardResult.error);
      return NextResponse.json(
        {
          error: "Failed to update database",
          details: leaderboardResult.error.message || JSON.stringify(leaderboardResult.error),
          sampleData: leaderboardWithRaceId[0] // Show first entry for debugging
        },
        { status: 500 }
      );
    }

    // Update last fetch timestamp
    await supabase
      .from("race_config")
      .update({ last_data_fetch: new Date().toISOString() })
      .eq("race_id", activeRace.id);

    return NextResponse.json({
      success: true,
      lapsInserted: lapsInserted,
      runnersUpdated: leaderboard.length,
      lapsCalculated: laps.length > 0 && lapsInserted === 0 ? false : true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron fetch:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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

    // Get active race and config (including start_date for elapsed time calculation)
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("id, start_date")
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

      // Note: Lap scraping has been moved to /api/admin/backfill-laps
      // Normal operation uses lap calculation from distance increases
      // This keeps the regular scraper fast and simple
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

    // Get the latest lap for each runner from race_laps table
    // This is the source of truth for what laps have been captured
    const { data: existingLaps } = await supabase
      .from("race_laps")
      .select("bib, lap, distance_km, race_time_sec")
      .eq("race_id", activeRace.id)
      .order("bib", { ascending: true })
      .order("lap", { ascending: false });

    // Create a map of latest lap per runner
    const latestLapMap = new Map();
    if (existingLaps) {
      existingLaps.forEach(lap => {
        if (!latestLapMap.has(lap.bib)) {
          latestLapMap.set(lap.bib, {
            lap: lap.lap,
            distanceKm: lap.distance_km,
            raceTimeSec: lap.race_time_sec,
          });
        }
      });
    }

    // Build "previous leaderboard" from latest laps
    const previousLeaderboard = leaderboard.map(entry => {
      const latestLap = latestLapMap.get(entry.bib);
      if (latestLap) {
        return {
          ...entry,
          lap: latestLap.lap,
          distanceKm: latestLap.distanceKm,
          raceTimeSec: latestLap.raceTimeSec,
        };
      }
      // No laps yet for this runner - start from 0
      return {
        ...entry,
        lap: 0,
        distanceKm: 0,
        raceTimeSec: 0,
      };
    });

    // If no lap data from source, calculate from distance increases
    if (laps.length === 0) {
      const lapConfig: LapCalculationConfig = {
        lapDistanceKm: parseFloat(process.env.LAP_DISTANCE || "1.5"),
        firstLapDistanceKm: parseFloat(
          process.env.FIRST_LAP_DISTANCE ||
            config?.first_lap_distance_km?.toString() ||
            "0.2"
        ),
        tolerancePercent: 10,
      };

      const calculatedLaps = await calculateLapsFromLeaderboard(
        leaderboard,
        previousLeaderboard as LeaderboardEntry[],
        lapConfig
      );

      laps = calculatedLaps;

      // Debug: Show first few calculated laps for bib 191
      const bib191Laps = calculatedLaps.filter(lap => lap.bib === 191).slice(0, 5);
      if (bib191Laps.length > 0) {
        console.log(`Calculated laps for Bib 191:`, bib191Laps.map(lap => `Lap ${lap.lap}: ${lap.raceTimeSec}s, ${lap.distanceKm}km`));
      }
    }

    // Match leaderboard entries with our runner database to get ALL runner info
    const { data: runners } = await supabase
      .from("runners")
      .select("bib, firstname, lastname, gender, nationality")
      .not("bib", "is", null);

    const runnerMap = new Map(
      runners?.map((r) => [r.bib, {
        name: `${r.firstname} ${r.lastname}`.trim(),
        gender: r.gender,
        country: r.nationality
      }])
    );

    // Enrich leaderboard with gender and country from database
    // Also calculate race time and projected distance
    const raceStartTime = new Date(activeRace.start_date).getTime();
    const race24Hours = 24 * 60 * 60; // 24 hours in seconds

    const enrichedLeaderboard = leaderboard.map((entry) => {
      const runner = runnerMap.get(entry.bib);

      // Calculate actual race time from last passing timestamp
      let raceTimeSec = 0;
      let projectedKm = 0;
      let lapTimeSec = 0;
      let lapPaceSec = 0;

      if (entry.lastPassing) {
        const lastPassingTime = new Date(entry.lastPassing).getTime();
        raceTimeSec = Math.floor((lastPassingTime - raceStartTime) / 1000);

        // Calculate projected 24h distance based on current pace
        if (raceTimeSec > 0 && entry.distanceKm > 0) {
          const currentPaceKmPerSec = entry.distanceKm / raceTimeSec;
          projectedKm = currentPaceKmPerSec * race24Hours;

          // Calculate lap pace (seconds per km)
          lapPaceSec = raceTimeSec / entry.distanceKm;
        }

        // Calculate average lap time
        if (entry.lap > 0) {
          lapTimeSec = raceTimeSec / entry.lap;
        }
      }

      return {
        ...entry,
        // Use ALL data from runners table (matched by bib)
        name: runner?.name || entry.name, // Fallback to Breizh Chrono if not in DB
        gender: runner?.gender?.toLowerCase() || "m",
        country: runner?.country || "XXX",
        raceTimeSec,
        projectedKm,
        lapTimeSec,
        lapPaceSec,
      };
    });

    // Sort overall leaderboard by distance (descending), then by last passing time (ascending for ties)
    enrichedLeaderboard.sort((a, b) => {
      // Primary sort: distance (higher is better)
      if (b.distanceKm !== a.distanceKm) {
        return b.distanceKm - a.distanceKm;
      }

      // Secondary sort: last passing time (earlier is better for same distance)
      if (a.lastPassing && b.lastPassing) {
        return new Date(a.lastPassing).getTime() - new Date(b.lastPassing).getTime();
      }

      return 0;
    });

    // Recalculate overall ranks based on sorted order
    enrichedLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Calculate gender ranks
    const menLeaderboard = enrichedLeaderboard
      .filter((e) => e.gender === "m")
      .sort((a, b) => {
        if (b.distanceKm !== a.distanceKm) return b.distanceKm - a.distanceKm;
        if (a.lastPassing && b.lastPassing) {
          return new Date(a.lastPassing).getTime() - new Date(b.lastPassing).getTime();
        }
        return 0;
      });
    const womenLeaderboard = enrichedLeaderboard
      .filter((e) => e.gender === "w")
      .sort((a, b) => {
        if (b.distanceKm !== a.distanceKm) return b.distanceKm - a.distanceKm;
        if (a.lastPassing && b.lastPassing) {
          return new Date(a.lastPassing).getTime() - new Date(b.lastPassing).getTime();
        }
        return 0;
      });

    menLeaderboard.forEach((entry, index) => {
      entry.genderRank = index + 1;
    });
    womenLeaderboard.forEach((entry, index) => {
      entry.genderRank = index + 1;
    });

    // Update database with upsert strategy (no deletion needed - prevents empty table flicker)
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
    }));

    // Use upsert to atomically update/insert - prevents table from being temporarily empty
    const leaderboardResult = await supabase
      .from("race_leaderboard")
      .upsert(leaderboardWithRaceId, {
        onConflict: "race_id,bib",
        ignoreDuplicates: false,
      });

    // Insert new laps (use upsert to avoid duplicates)
    let lapsInserted = 0;
    if (laps.length > 0) {
      // Get ONLY existing laps for bibs being updated (to preserve Puppeteer backfilled times)
      // This is much faster than fetching all 10k+ laps
      const bibsBeingUpdated = Array.from(new Set(laps.map(lap => lap.bib)));
      const { data: allExistingLaps } = await supabase
        .from("race_laps")
        .select("bib, lap, race_time_sec, lap_time_sec")
        .eq("race_id", activeRace.id)
        .in("bib", bibsBeingUpdated);

      console.log(`Fetched ${allExistingLaps?.length || 0} existing laps for ${bibsBeingUpdated.length} bibs`);

      // Create a map of existing laps with time data
      const existingLapTimesMap = new Map();
      if (allExistingLaps) {
        allExistingLaps.forEach((existingLap) => {
          const key = `${existingLap.bib}-${existingLap.lap}`;
          existingLapTimesMap.set(key, {
            raceTimeSec: existingLap.race_time_sec,
            lapTimeSec: existingLap.lap_time_sec,
          });
        });
      }

      // Map calculated laps to database format, preserving existing lap times if they exist
      let preservedCount = 0;
      const lapsWithRaceId = laps.map((lap) => {
        const key = `${lap.bib}-${lap.lap}`;
        const existingTimes = existingLapTimesMap.get(key);

        // If existing lap has non-zero times (from Puppeteer backfill), preserve them
        // Otherwise use calculated times (which might be 0 or undefined for distance-based detection)
        const raceTimeSec = existingTimes && existingTimes.raceTimeSec > 0
          ? existingTimes.raceTimeSec
          : (lap.raceTimeSec || 0);
        const lapTimeSec = existingTimes && existingTimes.lapTimeSec > 0
          ? existingTimes.lapTimeSec
          : (lap.lapTimeSec || 0);

        // Debug: Track preserved laps
        if (existingTimes && existingTimes.raceTimeSec > 0 && lap.bib === 191 && lap.lap <= 3) {
          console.log(`Preserving Bib ${lap.bib} Lap ${lap.lap}: existing=${existingTimes.raceTimeSec}s, calculated=${lap.raceTimeSec}s`);
          preservedCount++;
        }

        return {
          race_id: activeRace.id,
          bib: lap.bib,
          lap: lap.lap,
          lap_time_sec: lapTimeSec,
          race_time_sec: raceTimeSec,
          distance_km: lap.distanceKm,
          rank: lap.rank || null,
          gender_rank: lap.genderRank || null,
          age_group_rank: lap.ageGroupRank || null,
          lap_pace: lap.lapPace,
          avg_pace: lap.avgPace,
          timestamp: lap.timestamp,
        };
      });

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

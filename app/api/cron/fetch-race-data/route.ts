// app/api/cron/fetch-race-data/route.ts
// Vercel Cron job endpoint to fetch and update race data
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
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

    // Use service role client to bypass RLS (cron is trusted, authenticated by CRON_SECRET)
    const supabase = createServiceClient();

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
      .select("*, start_time_offset_seconds")
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

    try {
      leaderboard = await adapter.fetchLeaderboard();

      // Note: Lap calculation has been moved to /api/cron/calculate-laps
      // This keeps the leaderboard scraper fast and ensures immediate updates
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

    // CRITICAL: Calculate race times from timestamps
    // The BreizhChronoAdapter returns raceTimeSec=0 as a placeholder
    // We must calculate it from lastPassing timestamp for accurate calculations
    const raceStartTime = new Date(activeRace.start_date).getTime();
    const startTimeOffsetSec = config?.start_time_offset_seconds || 0; // Race started late offset

    leaderboard = leaderboard.map((entry) => {
      let raceTimeSec = 0;

      if (entry.lastPassing) {
        const lastPassingTime = new Date(entry.lastPassing).getTime();
        // Subtract offset to get true race time (race started late)
        raceTimeSec = Math.floor((lastPassingTime - raceStartTime) / 1000) - startTimeOffsetSec;
      }

      return {
        ...entry,
        raceTimeSec, // Override the placeholder 0 from adapter with calculated value
      };
    });

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

    // Get latest lap data to calculate ACTUAL last lap time
    // We need the previous lap's race_time_sec to calculate current lap time
    const { data: latestLapTimes } = await supabase
      .rpc('get_latest_laps_per_runner', { race_id_param: activeRace.id });

    const latestLapTimeMap = new Map<number, { lap: number; raceTimeSec: number }>();
    if (latestLapTimes) {
      latestLapTimes.forEach((lapRecord: any) => {
        latestLapTimeMap.set(lapRecord.bib, {
          lap: lapRecord.lap,
          raceTimeSec: lapRecord.race_time_sec,
        });
      });
    }

    // For runners where latest DB lap matches current lap, get the PREVIOUS lap
    const bibsNeedingPrevLap = leaderboard
      .filter(entry => {
        const latestLap = latestLapTimeMap.get(entry.bib);
        return latestLap && latestLap.lap === entry.lap && entry.lap > 1;
      })
      .map(e => e.bib);

    const prevLapMap = new Map<number, number>();
    if (bibsNeedingPrevLap.length > 0) {
      // Query for lap N-1 for these runners
      const { data: prevLaps } = await supabase
        .from("race_laps")
        .select("bib, lap, race_time_sec")
        .eq("race_id", activeRace.id)
        .in("bib", bibsNeedingPrevLap);

      if (prevLaps) {
        // For each bib, find the second-highest lap number
        const bibLapsMap = new Map<number, any[]>();
        prevLaps.forEach((lap: any) => {
          if (!bibLapsMap.has(lap.bib)) {
            bibLapsMap.set(lap.bib, []);
          }
          bibLapsMap.get(lap.bib)!.push(lap);
        });

        bibLapsMap.forEach((laps, bib) => {
          // Sort by lap desc and take the second one
          laps.sort((a, b) => b.lap - a.lap);
          if (laps.length >= 2) {
            prevLapMap.set(bib, laps[1].race_time_sec);
          }
        });
      }
    }

    // Enrich leaderboard with gender and country from database
    const race24Hours = 24 * 60 * 60; // 24 hours in seconds

    const enrichedLeaderboard = leaderboard.map((entry) => {
      const runner = runnerMap.get(entry.bib);

      // Calculate projected distance and paces
      let projectedKm = 0;
      let lapTimeSec = 0;
      let lapPaceSec = 0;

      if (entry.raceTimeSec > 0 && entry.distanceKm > 0) {
        // Calculate projected 24h distance based on current pace
        const currentPaceKmPerSec = entry.distanceKm / entry.raceTimeSec;
        projectedKm = currentPaceKmPerSec * race24Hours;

        // Calculate lap pace (seconds per km)
        lapPaceSec = entry.raceTimeSec / entry.distanceKm;
      }

      // Calculate ACTUAL last lap time from race_laps table
      // ALWAYS calculate from race time difference (don't trust stored lap_time_sec - it may have bad data)
      const latestLapData = latestLapTimeMap.get(entry.bib);

      if (latestLapData) {
        if (latestLapData.lap === entry.lap) {
          // Same lap already in DB - get previous lap's race time
          const prevRaceTime = prevLapMap.get(entry.bib);
          if (prevRaceTime !== undefined) {
            lapTimeSec = entry.raceTimeSec - prevRaceTime;
          } else {
            // First lap or no previous lap data - use average
            lapTimeSec = entry.lap > 0 ? entry.raceTimeSec / entry.lap : 0;
          }
        } else {
          // New lap detected - calculate from latest lap in DB
          lapTimeSec = entry.raceTimeSec - latestLapData.raceTimeSec;
        }
      }

      // Fallback to average if we still don't have a lap time
      if (lapTimeSec <= 0 && entry.lap > 0 && entry.raceTimeSec > 0) {
        lapTimeSec = entry.raceTimeSec / entry.lap;
      }

      return {
        ...entry,
        // Use ALL data from runners table (matched by bib)
        name: runner?.name || entry.name, // Fallback to Breizh Chrono if not in DB
        gender: runner?.gender?.toLowerCase() || "m",
        country: runner?.country || "XXX",
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

    // IMMEDIATE UPSERT - Don't wait for lap calculations!
    // This ensures leaderboard updates in ~2-3 seconds instead of 15-20 seconds
    const leaderboardResult = await supabase
      .from("race_leaderboard")
      .upsert(leaderboardWithRaceId, {
        onConflict: "race_id,bib",
        ignoreDuplicates: false,
      });

    if (leaderboardResult.error) {
      console.error("Leaderboard upsert error:", leaderboardResult.error);
      return NextResponse.json(
        {
          error: "Failed to update leaderboard",
          details: leaderboardResult.error.message || JSON.stringify(leaderboardResult.error),
          sampleData: leaderboardWithRaceId[0] // Show first entry for debugging
        },
        { status: 500 }
      );
    }

    console.log(`✅ Leaderboard updated: ${leaderboard.length} runners`);

    // FAST lap sync: Insert CURRENT lap if lap count increased
    // This ensures leaderboard lap count matches lap details immediately
    // Heavy lap validation/backfill still happens in /api/cron/calculate-laps
    let newLapsInserted = 0;
    try {
      // Get max lap per runner (lightweight query - only returns one row per runner)
      const { data: maxLaps } = await supabase
        .rpc('get_latest_laps_per_runner', { race_id_param: activeRace.id });

      const maxLapMap = new Map<number, number>();
      if (maxLaps) {
        maxLaps.forEach((lap: any) => {
          maxLapMap.set(lap.bib, lap.lap);
        });
      }

      // Find runners who completed a new lap
      const runnersWithNewLaps = enrichedLeaderboard.filter(entry => {
        const maxLap = maxLapMap.get(entry.bib) || 0;
        return entry.lap > maxLap && entry.raceTimeSec > 0;
      });

      if (runnersWithNewLaps.length === 0) {
        console.log("No new laps detected");
      } else {
        console.log(`Detected ${runnersWithNewLaps.length} runners with new laps`);

        // Batch query: Get previous lap data for all runners with new laps
        const bibsWithNewLaps = runnersWithNewLaps.map(e => e.bib);
        const lapsToQuery = runnersWithNewLaps.map(e => maxLapMap.get(e.bib) || 0);

        // Build a map to look up previous lap data
        const { data: prevLaps } = await supabase
          .from("race_laps")
          .select("bib, lap, race_time_sec, distance_km")
          .eq("race_id", activeRace.id)
          .in("bib", bibsWithNewLaps);

        const prevLapMap = new Map<string, { raceTimeSec: number; distanceKm: number }>();
        if (prevLaps) {
          prevLaps.forEach((lap: any) => {
            const key = `${lap.bib}-${lap.lap}`;
            prevLapMap.set(key, {
              raceTimeSec: lap.race_time_sec,
              distanceKm: lap.distance_km,
            });
          });
        }

        // Calculate new laps
        const newLaps: any[] = [];
        for (const entry of runnersWithNewLaps) {
          const maxLap = maxLapMap.get(entry.bib) || 0;
          const prevLapKey = `${entry.bib}-${maxLap}`;
          const prevLap = prevLapMap.get(prevLapKey);

          const previousRaceTime = prevLap?.raceTimeSec || 0;
          const previousDistance = prevLap?.distanceKm || 0;
          const lapTimeSec = entry.raceTimeSec - previousRaceTime;
          const lapDistanceKm = entry.distanceKm - previousDistance;

          // Only insert if lap time is valid
          if (lapTimeSec > 0) {
            const lapPace = lapDistanceKm > 0 ? lapTimeSec / lapDistanceKm : 0;
            const avgPace = entry.distanceKm > 0 ? entry.raceTimeSec / entry.distanceKm : 0;

            newLaps.push({
              race_id: activeRace.id,
              bib: entry.bib,
              lap: entry.lap,
              lap_time_sec: lapTimeSec,
              race_time_sec: entry.raceTimeSec,
              distance_km: entry.distanceKm,
              rank: entry.rank,
              gender_rank: entry.genderRank,
              age_group_rank: null,
              lap_pace: lapPace,
              avg_pace: avgPace,
              timestamp: entry.lastPassing || new Date().toISOString(),
            });
          }
        }

        // Insert new laps (if any)
        if (newLaps.length > 0) {
          const { error: insertError } = await supabase
            .from("race_laps")
            .insert(newLaps);

          if (!insertError) {
            newLapsInserted = newLaps.length;
            console.log(`✅ Inserted ${newLapsInserted} new current laps`);
          } else {
            console.error("Error inserting new laps:", insertError);
          }
        }
      }
    } catch (lapError) {
      console.error("Error in fast lap sync:", lapError);
      // Don't fail the whole request if lap sync fails
    }

    // Update last fetch timestamp
    await supabase
      .from("race_config")
      .update({ last_data_fetch: new Date().toISOString() })
      .eq("race_id", activeRace.id);

    return NextResponse.json({
      success: true,
      runnersUpdated: leaderboard.length,
      newLapsInserted,
      timestamp: new Date().toISOString(),
      message: "Leaderboard and current laps updated successfully.",
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

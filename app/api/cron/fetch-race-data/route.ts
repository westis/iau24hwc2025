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

    // CRITICAL: Calculate race times from timestamps BEFORE lap calculation
    // The BreizhChronoAdapter returns raceTimeSec=0 as a placeholder
    // We must calculate it from lastPassing timestamp for accurate lap calculations
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

    // Get the latest lap for each runner from race_laps table
    // This is the source of truth for what laps have been captured
    const { data: existingLaps, error: lapsQueryError } = await supabase
      .from("race_laps")
      .select("bib, lap, distance_km, race_time_sec")
      .eq("race_id", activeRace.id)
      .order("bib", { ascending: true })
      .order("lap", { ascending: false });

    if (lapsQueryError) {
      console.error("ERROR querying existing laps:", lapsQueryError);
    }
    console.log(`Existing laps query returned ${existingLaps?.length || 0} rows`);

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
    console.log(`latestLapMap has ${latestLapMap.size} entries`);
    if (latestLapMap.size > 0) {
      const first = Array.from(latestLapMap.entries())[0];
      console.log(`Sample: Bib ${first[0]} has latestLap=${first[1].lap}`);
    }

    // Build "previous leaderboard" from latest laps
    // IMPORTANT: Don't use current entry spread (...entry) as it includes current lastPassing
    // which would make both current and previous have the same timestamp!
    const previousLeaderboard = leaderboard.map(entry => {
      const latestLap = latestLapMap.get(entry.bib);
      if (latestLap) {
        // Build minimal previous entry with ONLY data from database
        return {
          bib: entry.bib,
          name: entry.name,
          rank: entry.rank,
          genderRank: entry.genderRank,
          gender: entry.gender,
          country: entry.country,
          timestamp: entry.timestamp,
          // Use database values for lap data (this is the "previous" state)
          lap: latestLap.lap,
          distanceKm: latestLap.distanceKm,
          raceTimeSec: latestLap.raceTimeSec,
          // DON'T include lastPassing - this prevents timestamp collision with current
          projectedKm: 0,
          lapPaceSec: 0,
          lapTimeSec: 0,
        } as LeaderboardEntry;
      }
      // No laps yet for this runner - start from 0
      return {
        bib: entry.bib,
        name: entry.name,
        rank: entry.rank,
        genderRank: entry.genderRank,
        gender: entry.gender,
        country: entry.country,
        timestamp: entry.timestamp,
        lap: 0,
        distanceKm: 0,
        raceTimeSec: 0,
        projectedKm: 0,
        lapPaceSec: 0,
        lapTimeSec: 0,
      } as LeaderboardEntry;
    });

    // CRITICAL: Only insert CURRENT lap (from leaderboard), NOT historical laps
    // Historical laps should come from Puppeteer backfill with accurate times
    // This prevents inserting estimated/calculated laps that would be overwritten later
    let newLapCandidates = 0;
    let skippedNoLapIncrease = 0;
    let skippedNoRaceTime = 0;
    const debugSamples: any[] = [];

    if (laps.length === 0) {
      for (const entry of leaderboard) {
        const latestLap = latestLapMap.get(entry.bib);
        const currentLapNum = entry.lap; // Lap number from leaderboard
        const latestLapNum = latestLap?.lap || 0;

        // Debug: Collect first 5 samples for response
        if (debugSamples.length < 5) {
          debugSamples.push({
            bib: entry.bib,
            currentLap: currentLapNum,
            latestLap: latestLapNum,
            raceTime: entry.raceTimeSec,
          });
        }

        // Only insert if runner completed a NEW lap since last check
        if (currentLapNum > latestLapNum) {
          if (entry.raceTimeSec > 0) {
            newLapCandidates++;
          } else {
            skippedNoRaceTime++;
          }
        } else {
          skippedNoLapIncrease++;
        }

        if (currentLapNum > latestLapNum && entry.raceTimeSec > 0) {
          // Calculate lap time (time since last lap)
          const previousRaceTime = latestLap?.raceTimeSec || 0;
          const lapTimeSec = entry.raceTimeSec - previousRaceTime;

          // Only insert if lap time is positive (valid)
          if (lapTimeSec > 0) {
            // Calculate paces
            const previousDistance = latestLap?.distanceKm || 0;
            const lapDistanceKm = entry.distanceKm - previousDistance;
            const lapPace = lapDistanceKm > 0 ? lapTimeSec / lapDistanceKm : 0;
            const avgPace = entry.distanceKm > 0 ? entry.raceTimeSec / entry.distanceKm : 0;

            laps.push({
              bib: entry.bib,
              lap: currentLapNum, // ONLY the current lap!
              lapTimeSec,
              raceTimeSec: entry.raceTimeSec,
              distanceKm: entry.distanceKm,
              rank: entry.rank,
              genderRank: entry.genderRank,
              ageGroupRank: null,
              lapPace,
              avgPace,
              timestamp: new Date().toISOString(),
            });

            console.log(`📊 Bib ${entry.bib}: New lap ${currentLapNum} detected (time: ${lapTimeSec}s, distance: ${entry.distanceKm}km)`);
          }
        }
      }

      console.log(`✅ Detected ${laps.length} new current laps from leaderboard`);
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
    // Note: raceTimeSec was already calculated earlier (before lap calculation)
    const race24Hours = 24 * 60 * 60; // 24 hours in seconds

    const enrichedLeaderboard = leaderboard.map((entry) => {
      const runner = runnerMap.get(entry.bib);

      // Calculate projected distance and paces (raceTimeSec already set above)
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

      // Calculate average lap time
      if (entry.lap > 0 && entry.raceTimeSec > 0) {
        lapTimeSec = entry.raceTimeSec / entry.lap;
      }

      return {
        ...entry,
        // Use ALL data from runners table (matched by bib)
        name: runner?.name || entry.name, // Fallback to Breizh Chrono if not in DB
        gender: runner?.gender?.toLowerCase() || "m",
        country: runner?.country || "XXX",
        // raceTimeSec already calculated, just use it
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

    // Insert ONLY NEW laps - NEVER overwrite existing data
    let lapsInserted = 0;
    if (laps.length > 0) {
      // Get existing laps to check which ones already exist
      const bibsBeingUpdated = Array.from(new Set(laps.map(lap => lap.bib)));
      const { data: allExistingLaps } = await supabase
        .from("race_laps")
        .select("bib, lap")
        .eq("race_id", activeRace.id)
        .in("bib", bibsBeingUpdated);

      console.log(`Fetched ${allExistingLaps?.length || 0} existing laps for ${bibsBeingUpdated.length} bibs`);

      // Create a Set of existing lap keys for fast lookup
      const existingLapKeys = new Set<string>();
      if (allExistingLaps) {
        allExistingLaps.forEach((existingLap) => {
          const key = `${existingLap.bib}-${existingLap.lap}`;
          existingLapKeys.add(key);
        });
      }

      // FILTER: Only keep laps that DON'T already exist in database
      const newLapsOnly = laps.filter((lap) => {
        const key = `${lap.bib}-${lap.lap}`;
        return !existingLapKeys.has(key);
      });

      if (newLapsOnly.length === 0) {
        console.log("No new laps to insert (all calculated laps already exist in database)");
      } else {
        console.log(`Inserting ${newLapsOnly.length} NEW laps (filtered out ${laps.length - newLapsOnly.length} existing laps)`);

        // Map new laps to database format and VALIDATE times
        const lapsWithRaceId = newLapsOnly
          .map((lap) => ({
            race_id: activeRace.id,
            bib: lap.bib,
            lap: lap.lap,
            lap_time_sec: lap.lapTimeSec || 0,
            race_time_sec: lap.raceTimeSec || 0,
            distance_km: lap.distanceKm,
            rank: lap.rank || null,
            gender_rank: lap.genderRank || null,
            age_group_rank: lap.ageGroupRank || null,
            lap_pace: lap.lapPace,
            avg_pace: lap.avgPace,
            timestamp: lap.timestamp,
          }))
          // CRITICAL: Filter out laps with invalid times (0 or negative)
          // This prevents corrupting puppeteer backfill data with calculated 0:00 times
          .filter((lap) => {
            const isValid = lap.lap_time_sec > 0 && lap.race_time_sec > 0;
            if (!isValid) {
              console.log(`⚠️  Skipping invalid lap for Bib ${lap.bib} Lap ${lap.lap}: lap_time=${lap.lap_time_sec}s, race_time=${lap.race_time_sec}s`);
            }
            return isValid;
          });

        // Check if we have any valid laps to insert after filtering
        if (lapsWithRaceId.length === 0) {
          console.log("⚠️  All calculated laps had invalid times (0 or negative), skipping insert");
        } else {
          console.log(`✅ Inserting ${lapsWithRaceId.length} validated laps`);

          // Use INSERT (not upsert) since we've already filtered out existing laps
          const lapsResult = await supabase
            .from("race_laps")
            .insert(lapsWithRaceId);

          if (lapsResult.error) {
            console.error("Laps insert error:", lapsResult.error);
          } else {
            lapsInserted = lapsWithRaceId.length;
          }
        }
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
      debug: {
        existingLapsCount: existingLaps?.length || 0,
        latestLapMapSize: latestLapMap.size,
        newLapCandidates,
        skippedNoLapIncrease,
        skippedNoRaceTime,
        samples: debugSamples,
      },
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

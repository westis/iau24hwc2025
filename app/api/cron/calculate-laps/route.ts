// app/api/cron/calculate-laps/route.ts
// Separate endpoint for lap calculation - runs independently from leaderboard updates
// This prevents slow lap queries from blocking fast leaderboard updates
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for lap calculations

/**
 * Calculate and insert new laps based on leaderboard distance increases
 *
 * This endpoint:
 * 1. Queries race_leaderboard for current runner states
 * 2. Queries race_laps for latest lap per runner
 * 3. Detects new laps (lap number increased)
 * 4. Inserts ONLY new laps (never overwrites existing data)
 *
 * Can be called less frequently than leaderboard updates (e.g., every 60 seconds)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    // Use service role client to bypass RLS
    const supabase = createServiceClient();

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

    const { data: config } = await supabase
      .from("race_config")
      .select("race_state")
      .eq("race_id", activeRace.id)
      .single();

    // Only calculate laps if race is live
    if (config?.race_state !== "live") {
      return NextResponse.json({
        message: "Race not live, skipping lap calculation",
        raceState: config?.race_state,
      });
    }

    // Get current leaderboard state
    const { data: leaderboard } = await supabase
      .from("race_leaderboard")
      .select("bib, lap, distance_km, race_time_sec, rank, gender_rank")
      .eq("race_id", activeRace.id)
      .order("bib");

    if (!leaderboard || leaderboard.length === 0) {
      return NextResponse.json({
        message: "No leaderboard data found",
      });
    }

    console.log(`Processing ${leaderboard.length} runners for lap calculation`);

    // Get latest lap for each runner using Postgres function
    // This bypasses the 1000-row limit by doing aggregation in the database
    const { data: latestLaps, error: lapsQueryError } = await supabase
      .rpc('get_latest_laps_per_runner', { race_id_param: activeRace.id });

    if (lapsQueryError) {
      console.error("ERROR querying latest laps:", lapsQueryError);
      return NextResponse.json(
        { error: "Failed to query latest laps", details: lapsQueryError },
        { status: 500 }
      );
    }

    console.log(`Latest laps query returned ${latestLaps?.length || 0} rows`);

    // Create a map of latest lap per runner
    const latestLapMap = new Map();
    if (latestLaps) {
      latestLaps.forEach((lap: any) => {
        latestLapMap.set(lap.bib, {
          lap: lap.lap,
          distanceKm: lap.distance_km,
          raceTimeSec: lap.race_time_sec,
        });
      });
    }

    // Detect new laps
    const newLaps: any[] = [];
    let skippedNoLapIncrease = 0;
    let skippedNoRaceTime = 0;

    for (const entry of leaderboard) {
      const latestLap = latestLapMap.get(entry.bib);
      const currentLapNum = entry.lap;
      const latestLapNum = latestLap?.lap || 0;

      // Only process if runner completed a NEW lap since last check
      if (currentLapNum > latestLapNum) {
        if (entry.race_time_sec > 0) {
          // Calculate lap time (time since last lap)
          const previousRaceTime = latestLap?.raceTimeSec || 0;
          const lapTimeSec = entry.race_time_sec - previousRaceTime;

          // Only insert if lap time is positive (valid)
          if (lapTimeSec > 0) {
            // Calculate paces
            const previousDistance = latestLap?.distanceKm || 0;
            const lapDistanceKm = entry.distance_km - previousDistance;
            const lapPace = lapDistanceKm > 0 ? lapTimeSec / lapDistanceKm : 0;
            const avgPace = entry.distance_km > 0 ? entry.race_time_sec / entry.distance_km : 0;

            newLaps.push({
              bib: entry.bib,
              lap: currentLapNum,
              lapTimeSec,
              raceTimeSec: entry.race_time_sec,
              distanceKm: entry.distance_km,
              rank: entry.rank,
              genderRank: entry.gender_rank,
              ageGroupRank: null,
              lapPace,
              avgPace,
              timestamp: new Date().toISOString(),
            });

            console.log(`📊 Bib ${entry.bib}: New lap ${currentLapNum} detected (time: ${lapTimeSec}s, distance: ${entry.distance_km}km)`);
          }
        } else {
          skippedNoRaceTime++;
        }
      } else {
        skippedNoLapIncrease++;
      }
    }

    console.log(`✅ Detected ${newLaps.length} new laps (skipped: ${skippedNoLapIncrease} no increase, ${skippedNoRaceTime} no race time)`);

    // Insert new laps if any were found
    let lapsInserted = 0;
    if (newLaps.length > 0) {
      // Get existing laps to check which ones already exist (belt-and-suspenders check)
      const bibsBeingUpdated = Array.from(new Set(newLaps.map(lap => lap.bib)));
      const { data: allExistingLaps } = await supabase
        .from("race_laps")
        .select("bib, lap")
        .eq("race_id", activeRace.id)
        .in("bib", bibsBeingUpdated);

      // Create a Set of existing lap keys for fast lookup
      const existingLapKeys = new Set<string>();
      if (allExistingLaps) {
        allExistingLaps.forEach((existingLap: any) => {
          const key = `${existingLap.bib}-${existingLap.lap}`;
          existingLapKeys.add(key);
        });
      }

      // FILTER: Only keep laps that DON'T already exist in database
      const newLapsOnly = newLaps.filter((lap) => {
        const key = `${lap.bib}-${lap.lap}`;
        return !existingLapKeys.has(key);
      });

      if (newLapsOnly.length === 0) {
        console.log("No new laps to insert (all calculated laps already exist in database)");
      } else {
        console.log(`Inserting ${newLapsOnly.length} NEW laps (filtered out ${newLaps.length - newLapsOnly.length} existing laps)`);

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
          .filter((lap) => {
            const isValid = lap.lap_time_sec > 0 && lap.race_time_sec > 0;
            if (!isValid) {
              console.log(`⚠️  Skipping invalid lap for Bib ${lap.bib} Lap ${lap.lap}: lap_time=${lap.lap_time_sec}s, race_time=${lap.race_time_sec}s`);
            }
            return isValid;
          });

        // Insert validated laps
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
            return NextResponse.json(
              { error: "Failed to insert laps", details: lapsResult.error },
              { status: 500 }
            );
          } else {
            lapsInserted = lapsWithRaceId.length;
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      lapsInserted,
      lapsDetected: newLaps.length,
      runnersProcessed: leaderboard.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in lap calculation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

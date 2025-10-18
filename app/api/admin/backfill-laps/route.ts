// app/api/admin/backfill-laps/route.ts
// One-time endpoint to backfill missing historical lap data for top runners
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BreizhChronoAdapter } from "@/lib/live-race/breizh-chrono-adapter";

export const runtime = "edge";
export const dynamic = "force-dynamic";
// Note: Edge runtime has a 30s timeout limit

/**
 * Backfill missing lap data for top N runners
 * Call this once to populate historical lap data
 *
 * Usage:
 * POST /api/admin/backfill-laps
 * Headers: Authorization: Bearer <CRON_SECRET>
 * Body: { "topN": 20 } (optional, defaults to 20)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const topN = body.topN || 20;

    const supabase = await createClient();

    // Get active race
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

    // Get data source
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

    // Get current leaderboard to know which runners to backfill
    const adapter = new BreizhChronoAdapter(dataSourceUrl);
    const leaderboard = await adapter.fetchLeaderboard();

    // Get top N runners
    const topRunners = leaderboard.slice(0, topN);
    console.log(`Backfilling laps for top ${topRunners.length} runners`);

    // Get existing laps
    const { data: existingLaps } = await supabase
      .from("race_laps")
      .select("bib, lap")
      .eq("race_id", activeRace.id);

    const maxLapByBib = new Map<number, number>();
    if (existingLaps) {
      existingLaps.forEach(lap => {
        if (!maxLapByBib.has(lap.bib) || lap.lap > maxLapByBib.get(lap.bib)!) {
          maxLapByBib.set(lap.bib, lap.lap);
        }
      });
    }

    // Find runners with missing laps
    const runnersNeedingBackfill = topRunners.filter(runner => {
      const existingMaxLap = maxLapByBib.get(runner.bib) || 0;
      return runner.lap > existingMaxLap; // Has more laps than we have in DB
    });

    console.log(`${runnersNeedingBackfill.length} runners need lap backfill`);

    if (runnersNeedingBackfill.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No missing laps to backfill",
        runnersChecked: topRunners.length,
      });
    }

    // Fetch all laps for these runners
    const bibsToFetch = runnersNeedingBackfill.map(r => r.bib);
    const laps = await adapter.fetchLapDataForRunners(bibsToFetch);

    console.log(`Fetched ${laps.length} lap records`);

    // Calculate proper race times and distances
    const lapDistanceKm = parseFloat(process.env.LAP_DISTANCE || "1.5");
    const firstLapDistanceKm = parseFloat(
      process.env.FIRST_LAP_DISTANCE ||
        config?.first_lap_distance_km?.toString() ||
        "0.2"
    );

    // Group laps by bib to calculate cumulative times
    const lapsByBib = new Map<number, any[]>();
    laps.forEach(lap => {
      if (!lapsByBib.has(lap.bib)) {
        lapsByBib.set(lap.bib, []);
      }
      lapsByBib.get(lap.bib)!.push(lap);
    });

    // Sort laps within each bib and calculate cumulative values
    const lapsWithRaceId = [];
    for (const [bib, runnerLaps] of lapsByBib) {
      runnerLaps.sort((a, b) => a.lap - b.lap);

      let cumulativeTimeSec = 0;
      for (const lap of runnerLaps) {
        cumulativeTimeSec += lap.lapTimeSec;

        const distanceKm = lap.lap === 1
          ? firstLapDistanceKm
          : firstLapDistanceKm + (lap.lap - 1) * lapDistanceKm;

        const thisLapDistanceKm = lap.lap === 1 ? firstLapDistanceKm : lapDistanceKm;
        const lapPace = lap.lapTimeSec > 0
          ? lap.lapTimeSec / thisLapDistanceKm
          : 0;
        const avgPace = cumulativeTimeSec > 0 && distanceKm > 0
          ? cumulativeTimeSec / distanceKm
          : 0;

        lapsWithRaceId.push({
          race_id: activeRace.id,
          bib: lap.bib,
          lap: lap.lap,
          lap_time_sec: lap.lapTimeSec,
          race_time_sec: cumulativeTimeSec,
          distance_km: distanceKm,
          rank: lap.rank || null,
          gender_rank: lap.genderRank || null,
          age_group_rank: lap.ageGroupRank || null,
          lap_pace: lapPace,
          avg_pace: avgPace,
          timestamp: lap.timestamp,
        });
      }
    }

    // Insert laps using upsert
    const lapsResult = await supabase
      .from("race_laps")
      .upsert(lapsWithRaceId, {
        onConflict: "race_id,bib,lap",
        ignoreDuplicates: false,
      });

    if (lapsResult.error) {
      console.error("Laps insert error:", lapsResult.error);
      return NextResponse.json(
        {
          error: "Failed to insert laps",
          details: lapsResult.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      runnersBackfilled: runnersNeedingBackfill.length,
      lapsInserted: lapsWithRaceId.length,
      runners: runnersNeedingBackfill.map(r => ({
        bib: r.bib,
        name: r.name,
        currentLap: r.lap,
        previousMaxLap: maxLapByBib.get(r.bib) || 0,
      })),
    });
  } catch (error) {
    console.error("Error in backfill:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

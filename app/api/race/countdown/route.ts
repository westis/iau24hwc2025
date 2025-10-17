// app/api/race/countdown/route.ts
// API endpoint for crew countdown predictions

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  predictNextLapTime,
  calculateTimeUntilPassing,
  calculateCrewSpotTimeOffset,
} from "@/lib/live-race/lap-predictor";
import type {
  NextLapPrediction,
  CountdownResponse,
  LapTime,
} from "@/types/live-race";
import { raceCache } from "@/lib/live-race/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bibsParam = searchParams.get("bibs");
    const country = searchParams.get("country");
    const gender = searchParams.get("gender");
    const watchlist = searchParams.get("watchlist");

    const supabase = await createClient();

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

    // Get race config for lap distance and crew spot offset
    const { data: raceConfig } = await supabase
      .from("race_config")
      .select("course_distance_km, crew_spot_offset_meters")
      .eq("race_id", activeRace.id)
      .single();

    const lapDistanceKm = raceConfig?.course_distance_km || 0.821;
    const crewSpotOffsetMeters = raceConfig?.crew_spot_offset_meters || 0;

    // Build query for runners
    let query = supabase
      .from("race_leaderboard")
      .select(
        "bib, name, country, gender, last_passing, lap, distance_km, gender_rank"
      )
      .eq("race_id", activeRace.id);

    // Apply filters
    if (bibsParam) {
      const bibs = bibsParam.split(",").map((b) => parseInt(b.trim()));
      query = query.in("bib", bibs);
    } else if (country) {
      query = query.eq("country", country.toUpperCase());
      // Only filter by gender if provided and not "all"
      if (gender && gender !== "all") {
        query = query.eq("gender", gender);
      }
    } else if (watchlist === "true") {
      // For watchlist, bibs should be provided
      return NextResponse.json(
        { error: "Bibs parameter required for watchlist" },
        { status: 400 }
      );
    }

    const { data: runners, error: runnersError } = await query;

    if (runnersError) {
      console.error("Error fetching runners:", runnersError);
      return NextResponse.json(
        { error: "Failed to fetch runners" },
        { status: 500 }
      );
    }

    if (!runners || runners.length === 0) {
      console.log(
        `⚠️  No runners found for filters: country=${country}, gender=${gender}, bibs=${bibsParam}`
      );
      return NextResponse.json({
        predictions: [],
        crewSpotOffset: crewSpotOffsetMeters,
        lapDistance: lapDistanceKm,
        lastUpdate: new Date().toISOString(),
      });
    }

    console.log(
      `✅ Found ${runners.length} runner(s) for: country=${country}, gender=${gender}`
    );

    // Generate predictions for each runner
    const predictions: NextLapPrediction[] = [];
    const currentTime = new Date();

    for (const runner of runners) {
      // Skip if no last passing time
      if (!runner.last_passing) {
        continue;
      }

      // Fetch last 10 laps for this runner
      const { data: laps } = await supabase
        .from("race_laps")
        .select("*")
        .eq("race_id", activeRace.id)
        .eq("bib", runner.bib)
        .order("lap", { ascending: true })
        .limit(10);

      if (!laps || laps.length === 0) {
        continue;
      }

      // Convert to LapTime format
      const lapTimes: LapTime[] = laps.map((lap: any) => ({
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

      // Predict next lap time
      const prediction = predictNextLapTime(lapTimes);

      // Calculate time since last passing
      const lastPassingDate = new Date(runner.last_passing);
      const timeSinceLastPassing =
        (currentTime.getTime() - lastPassingDate.getTime()) / 1000;

      // Calculate time until timing mat
      const timeUntilTimingMat = calculateTimeUntilPassing(
        runner.last_passing,
        prediction.predictedLapTime,
        currentTime
      );

      // Calculate crew spot time offset
      const crewSpotTimeOffset = calculateCrewSpotTimeOffset(
        lapDistanceKm,
        crewSpotOffsetMeters,
        prediction.predictedLapTime
      );

      // Calculate time until crew spot (ADD offset since crew spot is AFTER timing mat)
      const timeUntilCrewSpot = timeUntilTimingMat + crewSpotTimeOffset;

      predictions.push({
        bib: runner.bib,
        name: runner.name,
        country: runner.country,
        gender: runner.gender,
        lastPassingTime: runner.last_passing,
        timeSinceLastPassing,
        predictedLapTime: prediction.predictedLapTime,
        timeUntilTimingMat,
        timeUntilCrewSpot,
        confidence: prediction.confidence,
        recentLaps: prediction.recentLaps,
        distanceKm: runner.distance_km,
        genderRank: runner.gender_rank,
      });
    }

    const response: CountdownResponse = {
      predictions,
      crewSpotOffset: crewSpotOffsetMeters,
      lapDistance: lapDistanceKm,
      lastUpdate: currentTime.toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, max-age=5, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error in countdown GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

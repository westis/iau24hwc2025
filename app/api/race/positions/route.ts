// app/api/race/positions/route.ts
// API endpoint for runner positions on race map

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  PositionsResponse,
  LapTime,
  LeaderboardEntry,
} from "@/types/live-race";
import {
  parseGPX,
  findClosestPointOnTrack,
  rotateTrackToStart,
  reverseTrack,
} from "@/lib/utils/gpx-parser";
import {
  calculateAllRunnerPositions,
  groupRunnersByStatus,
} from "@/lib/live-race/position-estimator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Cache GPX data in memory to avoid re-parsing on every request
let cachedGPXData: {
  track: any;
  coursePoints: { lat: number; lon: number }[];
  timestamp: number;
  timingMatKey: string; // Cache key based on timing mat coordinates
} | null = null;

const GPX_CACHE_DURATION = 60000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bibsParam = searchParams.get("bibs");

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

    // Get race config for map settings
    const { data: raceConfig } = await supabase
      .from("race_config")
      .select(
        "timing_mat_lat, timing_mat_lon, break_detection_threshold_multiplier, overdue_display_seconds, course_gpx_url, course_distance_km, reverse_track_direction, crew_spot_offset_m"
      )
      .eq("race_id", activeRace.id)
      .single();

    if (!raceConfig) {
      return NextResponse.json(
        { error: "Race configuration not found" },
        { status: 404 }
      );
    }

    // Validate timing mat coordinates
    if (!raceConfig.timing_mat_lat || !raceConfig.timing_mat_lon) {
      return NextResponse.json(
        { error: "Timing mat coordinates not configured" },
        { status: 400 }
      );
    }

    // Load and parse GPX file
    const gpxUrl = raceConfig.course_gpx_url || "/course/albi-24h.gpx";

    // Check cache - invalidate if timing mat coordinates or direction changed
    const now = Date.now();
    const timingMatKey = `${raceConfig.timing_mat_lat},${raceConfig.timing_mat_lon},${raceConfig.reverse_track_direction}`;
    const cacheInvalid =
      !cachedGPXData ||
      now - cachedGPXData.timestamp > GPX_CACHE_DURATION ||
      cachedGPXData.timingMatKey !== timingMatKey;

    if (cacheInvalid) {
      try {
        const gpxResponse = await fetch(
          `${
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
          }${gpxUrl}`
        );

        if (!gpxResponse.ok) {
          throw new Error(
            `Failed to fetch GPX file: ${gpxResponse.statusText}`
          );
        }

        const gpxText = await gpxResponse.text();
        let track = parseGPX(gpxText);

        // Find closest point on track to timing mat
        const closestPoint = findClosestPointOnTrack(
          track,
          raceConfig.timing_mat_lat,
          raceConfig.timing_mat_lon
        );

        // Validate timing mat is within 10 meters of the course
        const MAX_DISTANCE_FROM_TRACK = 10; // meters
        if (closestPoint.distance > MAX_DISTANCE_FROM_TRACK) {
          console.error(
            `Timing mat is ${closestPoint.distance.toFixed(
              1
            )}m from track (max: ${MAX_DISTANCE_FROM_TRACK}m)`
          );
          return NextResponse.json(
            {
              error: `Timing mat location is too far from the course track (${closestPoint.distance.toFixed(
                1
              )}m away). It must be within ${MAX_DISTANCE_FROM_TRACK} meters. Please adjust the timing mat position in the admin panel.`,
            },
            { status: 400 }
          );
        }

        // Rotate track so timing mat point becomes 0%/100%
        track = rotateTrackToStart(track, closestPoint.index);

        // Reverse track if needed (e.g., GPX recorded clockwise but race runs counterclockwise)
        if (raceConfig.reverse_track_direction) {
          track = reverseTrack(track);
        }

        const coursePoints = track.points.map((p) => ({
          lat: p.lat,
          lon: p.lon,
        }));

        cachedGPXData = {
          track,
          coursePoints,
          timestamp: now,
          timingMatKey,
        };

        console.log(
          `GPX track: ${track.totalDistance.toFixed(0)}m, ${
            track.points.length
          } points, timing mat ${closestPoint.distance.toFixed(
            1
          )}m from track, ${
            raceConfig.reverse_track_direction ? "REVERSED" : "normal"
          }`
        );
      } catch (error) {
        console.error("Error loading GPX file:", error);
        return NextResponse.json(
          { error: "Failed to load course GPX data" },
          { status: 500 }
        );
      }
    }

    // TypeScript null check (should never be null at this point)
    if (!cachedGPXData) {
      return NextResponse.json(
        { error: "Failed to load GPX data" },
        { status: 500 }
      );
    }

    const { track, coursePoints } = cachedGPXData;

    // Get leaderboard data
    let leaderboardQuery = supabase
      .from("race_leaderboard")
      .select(
        "bib, name, country, gender, rank, gender_rank, last_passing, distance_km"
      )
      .eq("race_id", activeRace.id);

    if (bibsParam) {
      const bibs = bibsParam.split(",").map((b) => parseInt(b.trim()));
      leaderboardQuery = leaderboardQuery.in("bib", bibs);
    }

    const { data: leaderboard, error: leaderboardError } =
      await leaderboardQuery;

    if (leaderboardError) {
      console.error("Error fetching leaderboard:", leaderboardError);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    if (!leaderboard || leaderboard.length === 0) {
      return NextResponse.json({
        positions: [],
        onBreak: [],
        timingMatPosition: {
          lat: raceConfig.timing_mat_lat,
          lon: raceConfig.timing_mat_lon,
        },
        courseTrack: coursePoints,
        lastUpdate: new Date().toISOString(),
      });
    }

    // Fetch laps for each runner (last 10 laps for prediction)
    const lapsMap = new Map<number, LapTime[]>();

    for (const runner of leaderboard) {
      const { data: laps } = await supabase
        .from("race_laps")
        .select("*")
        .eq("race_id", activeRace.id)
        .eq("bib", runner.bib)
        .order("lap", { ascending: false })
        .limit(10);

      if (laps && laps.length > 0) {
        const lapTimes: LapTime[] = laps.reverse().map((lap: any) => ({
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
        lapsMap.set(runner.bib, lapTimes);
      }
    }

    // Convert leaderboard to LeaderboardEntry format
    const leaderboardEntries: LeaderboardEntry[] = leaderboard.map(
      (lb: any) => ({
        bib: lb.bib,
        name: lb.name,
        rank: lb.rank,
        genderRank: lb.gender_rank,
        distanceKm: lb.distance_km,
        projectedKm: 0, // Not needed for position calculation
        raceTimeSec: 0,
        lapPaceSec: 0,
        lapTimeSec: 0,
        lap: 0,
        gender: lb.gender,
        timestamp: new Date().toISOString(),
        country: lb.country,
        lastPassing: lb.last_passing,
      })
    );

    // Calculate positions
    const breakConfig = {
      thresholdMultiplier:
        raceConfig.break_detection_threshold_multiplier || 2.5,
      overdueDisplaySeconds: raceConfig.overdue_display_seconds || 180,
    };

    const positions = calculateAllRunnerPositions(
      leaderboardEntries,
      lapsMap,
      track,
      raceConfig.timing_mat_lat,
      raceConfig.timing_mat_lon,
      breakConfig
    );

    // Group by status
    const grouped = groupRunnersByStatus(positions);

    // Calculate crew spot position based on offset from timing mat
    let crewSpotPosition = null;
    if (raceConfig.crew_spot_offset_m && raceConfig.crew_spot_offset_m > 0) {
      // Find point on track at crew_spot_offset_m distance from start (timing mat)
      const targetDistance = raceConfig.crew_spot_offset_m;
      let accumulatedDistance = 0;
      let crewSpotPoint = null;

      for (let i = 0; i < track.points.length - 1; i++) {
        const nextDistance = accumulatedDistance + (track.points[i + 1].distanceFromStart - track.points[i].distanceFromStart);
        
        if (nextDistance >= targetDistance) {
          // Interpolate between current and next point
          const segmentDistance = track.points[i + 1].distanceFromStart - track.points[i].distanceFromStart;
          const remainingDistance = targetDistance - accumulatedDistance;
          const ratio = segmentDistance > 0 ? remainingDistance / segmentDistance : 0;
          
          const lat = track.points[i].lat + (track.points[i + 1].lat - track.points[i].lat) * ratio;
          const lon = track.points[i].lon + (track.points[i + 1].lon - track.points[i].lon) * ratio;
          
          crewSpotPoint = { lat, lon };
          break;
        }
        
        accumulatedDistance = nextDistance;
      }

      crewSpotPosition = crewSpotPoint;
    }

    const response: PositionsResponse = {
      positions: [...grouped.racing, ...grouped.overdue],
      onBreak: grouped.onBreak,
      timingMatPosition: {
        lat: raceConfig.timing_mat_lat,
        lon: raceConfig.timing_mat_lon,
      },
      crewSpotPosition: crewSpotPosition,
      courseTrack: coursePoints,
      lastUpdate: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, max-age=5, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error in positions GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

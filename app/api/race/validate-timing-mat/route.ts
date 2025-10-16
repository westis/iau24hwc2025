// app/api/race/validate-timing-mat/route.ts
// Validate timing mat location before saving

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseGPX, findClosestPointOnTrack } from "@/lib/utils/gpx-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon } = body;

    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

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

    // Get race config for GPX URL
    const { data: raceConfig } = await supabase
      .from("race_config")
      .select("course_gpx_url")
      .eq("race_id", activeRace.id)
      .single();

    if (!raceConfig) {
      return NextResponse.json(
        { error: "Race configuration not found" },
        { status: 404 }
      );
    }

    // Load and parse GPX file
    const gpxUrl = raceConfig.course_gpx_url || "/course/albi-24h.gpx";
    const gpxResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}${gpxUrl}`
    );

    if (!gpxResponse.ok) {
      throw new Error(`Failed to fetch GPX file: ${gpxResponse.statusText}`);
    }

    const gpxText = await gpxResponse.text();
    const track = parseGPX(gpxText);

    // Find closest point on track to timing mat
    const closestPoint = findClosestPointOnTrack(track, lat, lon);

    const MAX_DISTANCE_FROM_TRACK = 10; // meters
    const isValid = closestPoint.distance <= MAX_DISTANCE_FROM_TRACK;

    return NextResponse.json({
      valid: isValid,
      distance: closestPoint.distance,
      maxDistance: MAX_DISTANCE_FROM_TRACK,
      closestPoint: {
        lat: closestPoint.point.lat,
        lon: closestPoint.point.lon,
      },
    });
  } catch (error) {
    console.error("Error validating timing mat:", error);
    return NextResponse.json(
      { error: "Failed to validate timing mat location" },
      { status: 500 }
    );
  }
}

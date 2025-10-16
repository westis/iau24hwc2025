// app/api/race/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache, cacheKeys } from "@/lib/live-race/cache";

export async function GET() {
  try {
    // Check cache first (10 second TTL)
    const cacheKey = cacheKeys.config();
    const cached = raceCache.get(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-Cache": "HIT",
          "Cache-Control":
            "public, max-age=10, s-maxage=10, stale-while-revalidate=20",
        },
      });
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

    // Get race config
    const { data: config, error } = await supabase
      .from("race_config")
      .select("*")
      .eq("race_id", activeRace.id)
      .single();

    if (error) {
      console.error("Error fetching race config:", error);
      return NextResponse.json(
        { error: "Failed to fetch race config" },
        { status: 500 }
      );
    }

    // Cache for 10 seconds
    raceCache.set(cacheKey, config, 10);

    return NextResponse.json(config, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control":
          "public, max-age=10, s-maxage=10, stale-while-revalidate=20",
      },
    });
  } catch (error) {
    console.error("Error in race config GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      raceState,
      courseGeojson,
      courseDistanceKm,
      currentRaceTimeSec,
      simulationMode,
      simulationStartTime,
    } = body;

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

    // Update config
    const updates: any = { updated_at: new Date().toISOString() };

    if (raceState) updates.race_state = raceState;
    if (courseGeojson) updates.course_geojson = courseGeojson;
    if (courseDistanceKm) updates.course_distance_km = courseDistanceKm;
    if (typeof currentRaceTimeSec !== "undefined")
      updates.current_race_time_sec = currentRaceTimeSec;
    if (typeof simulationMode !== "undefined")
      updates.simulation_mode = simulationMode;
    if (simulationStartTime)
      updates.simulation_start_time = simulationStartTime;

    const { data, error } = await supabase
      .from("race_config")
      .update(updates)
      .eq("race_id", activeRace.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating race config:", error);
      return NextResponse.json(
        { error: "Failed to update race config" },
        { status: 500 }
      );
    }

    // Clear cache after successful update
    raceCache.clearPattern("config");

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in race config PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

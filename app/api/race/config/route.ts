// app/api/race/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
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

    return NextResponse.json(config);
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

    const { raceState, courseGeojson, courseDistanceKm } = body;

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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in race config PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




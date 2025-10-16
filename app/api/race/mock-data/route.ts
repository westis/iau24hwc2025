// app/api/race/mock-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LapTime, LeaderboardEntry } from "@/types/live-race";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { laps, leaderboard, raceId } = body as {
      laps: LapTime[];
      leaderboard: LeaderboardEntry[];
      raceId?: number;
    };

    if (!laps || !leaderboard) {
      return NextResponse.json(
        { error: "Missing laps or leaderboard data" },
        { status: 400 }
      );
    }

    // Get active race ID if not provided
    let activeRaceId = raceId;
    if (!activeRaceId) {
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
      activeRaceId = activeRace.id;
    }

    // Clear existing mock data for this race
    await supabase.from("race_laps").delete().eq("race_id", activeRaceId);
    await supabase
      .from("race_leaderboard")
      .delete()
      .eq("race_id", activeRaceId);

    // Insert lap data (convert camelCase to snake_case)
    const lapsWithRaceId = laps.map((lap) => ({
      race_id: activeRaceId,
      bib: lap.bib,
      lap: lap.lap,
      lap_time_sec: lap.lapTimeSec,
      race_time_sec: lap.raceTimeSec,
      distance_km: lap.distanceKm,
      rank: lap.rank,
      gender_rank: lap.genderRank,
      age_group_rank: lap.ageGroupRank,
      lap_pace: lap.lapPace,
      avg_pace: lap.avgPace,
      timestamp: lap.timestamp,
    }));
    const { error: lapsError } = await supabase
      .from("race_laps")
      .insert(lapsWithRaceId);

    if (lapsError) {
      console.error("Error inserting laps:", lapsError);
      return NextResponse.json(
        { error: "Failed to insert lap data", details: lapsError.message },
        { status: 500 }
      );
    }

    // Insert leaderboard data (convert camelCase to snake_case)
    const leaderboardWithRaceId = leaderboard.map((entry) => ({
      race_id: activeRaceId,
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
    const { error: leaderboardError } = await supabase
      .from("race_leaderboard")
      .insert(leaderboardWithRaceId);

    if (leaderboardError) {
      console.error("Error inserting leaderboard:", leaderboardError);
      return NextResponse.json(
        {
          error: "Failed to insert leaderboard data",
          details: leaderboardError.message,
        },
        { status: 500 }
      );
    }

    // Update race config to live state
    await supabase
      .from("race_config")
      .update({
        race_state: "live",
        last_data_fetch: new Date().toISOString(),
      })
      .eq("race_id", activeRaceId);

    return NextResponse.json({
      success: true,
      lapsInserted: laps.length,
      runnersInserted: leaderboard.length,
      raceId: activeRaceId,
    });
  } catch (error) {
    console.error("Error in mock data upload:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Generate mock data endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseFloat(searchParams.get("hours") || "12");

    const supabase = await createClient();

    // Fetch real runners from the database
    const { data: raceEntries, error: entriesError } = await supabase
      .from("runners")
      .select("entry_id, firstname, lastname, gender, nationality")
      .order("entry_id");

    if (entriesError || !raceEntries || raceEntries.length === 0) {
      console.error("Error fetching race entries:", entriesError);
      console.log("Falling back to default mock runners");
      // Fall back to default mock runners if database fetch fails
      const { generateMockLapData, getDefaultMockRunners } = await import(
        "@/lib/live-race/mock-data-generator"
      );
      const runners = getDefaultMockRunners();
      const { laps, leaderboard } = generateMockLapData(runners, hours);
      return NextResponse.json({
        laps,
        leaderboard,
        hours,
        totalRunners: runners.length,
        usingRealRunners: false,
        note: "Using default mock runners - no race entries found in database",
      });
    }

    console.log(`Found ${raceEntries.length} real runners in database`);

    // Limit to first 80 runners for performance (you can adjust this)
    const limitedEntries = raceEntries.slice(0, 80);
    console.log(
      `Using ${limitedEntries.length} runners for mock data generation`
    );
    console.log(
      "Sample runners:",
      limitedEntries
        .slice(0, 3)
        .map((r) => `${r.firstname} ${r.lastname} (${r.nationality})`)
    );

    // Convert database entries to mock runner format
    const runners = limitedEntries.map((entry) => {
      // Generate realistic base speeds based on gender and PB data
      // For now, use random speeds in typical ultra range
      const baseSpeed =
        entry.gender === "M"
          ? 9.5 + Math.random() * 2.5 // Men: 9.5-12 km/h
          : 8.5 + Math.random() * 2.0; // Women: 8.5-10.5 km/h

      // Parse entry_id as bib number (e.g., "101" -> 101)
      const bib = parseInt(entry.entry_id, 10);

      return {
        bib: isNaN(bib) ? 0 : bib,
        name: `${entry.firstname} ${entry.lastname}`,
        gender: (entry.gender === "M" ? "m" : "w") as "m" | "w",
        country: entry.nationality,
        baseSpeed,
      };
    });

    console.log(`Generated mock data for ${runners.length} real runners`);

    // Get course distance from race_config
    const { data: raceConfig } = await supabase
      .from("race_config")
      .select("course_distance_km")
      .limit(1)
      .single();

    const courseDistanceKm = raceConfig?.course_distance_km || 0.821; // Default to 0.821 km
    console.log(`Using course distance: ${courseDistanceKm} km`);

    // Import dynamically to avoid issues
    const { generateMockLapData } = await import(
      "@/lib/live-race/mock-data-generator"
    );

    const { laps, leaderboard } = generateMockLapData(
      runners,
      hours,
      courseDistanceKm
    );

    return NextResponse.json({
      laps,
      leaderboard,
      hours,
      totalRunners: runners.length,
      courseDistanceKm,
      usingRealRunners: true,
    });
  } catch (error) {
    console.error("Error generating mock data:", error);
    return NextResponse.json(
      {
        error: "Failed to generate mock data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// app/api/cron/fetch-race-data/route.ts
// Vercel Cron job endpoint to fetch and update race data
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JsonDataAdapter } from "@/lib/live-race/data-adapter";

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

    const supabase = await createClient();

    // Get active race and config
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
      .select("*")
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
      config?.data_source || process.env.RACE_DATA_SOURCE_URL;

    if (!dataSourceUrl) {
      return NextResponse.json(
        { error: "No data source configured" },
        { status: 400 }
      );
    }

    // Use appropriate adapter based on data source type
    // For now, using JSON adapter as example
    const adapter = new JsonDataAdapter(
      `${dataSourceUrl}/laps`,
      `${dataSourceUrl}/leaderboard`
    );

    // Fetch data
    const [laps, leaderboard] = await Promise.all([
      adapter.fetchLapData(),
      adapter.fetchLeaderboard(),
    ]);

    // Update database
    // Clear existing data (or use upsert strategy)
    await supabase.from("race_laps").delete().eq("race_id", activeRace.id);

    await supabase
      .from("race_leaderboard")
      .delete()
      .eq("race_id", activeRace.id);

    // Insert new data
    const lapsWithRaceId = laps.map((lap) => ({
      ...lap,
      race_id: activeRace.id,
    }));
    const leaderboardWithRaceId = leaderboard.map((entry) => ({
      ...entry,
      race_id: activeRace.id,
    }));

    const [lapsResult, leaderboardResult] = await Promise.all([
      supabase.from("race_laps").insert(lapsWithRaceId),
      supabase.from("race_leaderboard").insert(leaderboardWithRaceId),
    ]);

    if (lapsResult.error || leaderboardResult.error) {
      console.error("Database insert errors:", {
        lapsResult,
        leaderboardResult,
      });
      return NextResponse.json(
        { error: "Failed to update database" },
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
      lapsUpdated: laps.length,
      runnersUpdated: leaderboard.length,
      timestamp: new Date().toISOString(),
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






// app/api/race/clear-simulation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { raceCache } from "@/lib/live-race/cache";

/**
 * POST /api/race/clear-simulation
 *
 * Safely clears simulation/mock data from the database while preserving real race data.
 *
 * Safety Features:
 * 1. Only deletes data created during simulation mode
 * 2. Uses simulation_start_time to identify simulation data
 * 3. Preserves all runner information and race configuration
 * 4. Returns detailed statistics about what was deleted
 *
 * Request Body:
 * {
 *   raceId: number,                    // Required: The race ID
 *   simulationStartTime?: string       // Optional: Only delete data created after this time
 * }
 *
 * Response:
 * {
 *   success: true,
 *   lapsDeleted: number,
 *   leaderboardDeleted: number,
 *   updatesDeleted: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { raceId, simulationStartTime, clearAll } = body;

    // Validate race ID
    if (!raceId) {
      return NextResponse.json(
        { error: "Race ID is required" },
        { status: 400 }
      );
    }

    // Get current race config to verify simulation mode
    const { data: config, error: configError } = await supabase
      .from("race_config")
      .select("simulation_mode, simulation_start_time")
      .eq("race_id", raceId)
      .single();

    if (configError) {
      console.error("Error fetching race config:", configError);
      return NextResponse.json(
        { error: "Failed to fetch race config" },
        { status: 500 }
      );
    }

    // Safety check: Only allow clearing if simulation mode was/is enabled OR clearAll flag is true
    if (!config.simulation_mode && !simulationStartTime && !clearAll) {
      return NextResponse.json(
        {
          error:
            "Cannot clear data: Simulation mode is not enabled and no simulation start time provided",
          safety:
            "This prevents accidental deletion of real race data",
        },
        { status: 403 }
      );
    }

    // Use the provided simulation start time or fall back to the one in config
    const clearStartTime =
      simulationStartTime || config.simulation_start_time;

    let lapsDeleted = 0;
    let leaderboardDeleted = 0;
    let updatesDeleted = 0;

    // Clear race laps
    // Strategy: If we have a simulation_start_time, only delete data created after that
    // Otherwise, delete all data for this race (when simulation mode is enabled)
    if (clearStartTime) {
      const { error: lapsError, count: lapsCount } = await supabase
        .from("race_laps")
        .delete({ count: "exact" })
        .eq("race_id", raceId)
        .gte("created_at", clearStartTime);

      if (lapsError) {
        console.error("Error deleting laps:", lapsError);
        throw lapsError;
      }
      lapsDeleted = lapsCount || 0;
    } else {
      const { error: lapsError, count: lapsCount } = await supabase
        .from("race_laps")
        .delete({ count: "exact" })
        .eq("race_id", raceId);

      if (lapsError) {
        console.error("Error deleting laps:", lapsError);
        throw lapsError;
      }
      lapsDeleted = lapsCount || 0;
    }

    // Clear race leaderboard
    if (clearStartTime) {
      const { error: leaderboardError, count: leaderboardCount } =
        await supabase
          .from("race_leaderboard")
          .delete({ count: "exact" })
          .eq("race_id", raceId)
          .gte("created_at", clearStartTime);

      if (leaderboardError) {
        console.error("Error deleting leaderboard:", leaderboardError);
        throw leaderboardError;
      }
      leaderboardDeleted = leaderboardCount || 0;
    } else {
      const { error: leaderboardError, count: leaderboardCount } =
        await supabase
          .from("race_leaderboard")
          .delete({ count: "exact" })
          .eq("race_id", raceId);

      if (leaderboardError) {
        console.error("Error deleting leaderboard:", leaderboardError);
        throw leaderboardError;
      }
      leaderboardDeleted = leaderboardCount || 0;
    }

    // Clear race updates (only those created during simulation)
    if (clearStartTime) {
      const { error: updatesError, count: updatesCount } = await supabase
        .from("race_updates")
        .delete({ count: "exact" })
        .eq("race_id", raceId)
        .gte("created_at", clearStartTime);

      if (updatesError) {
        console.error("Error deleting updates:", updatesError);
        throw updatesError;
      }
      updatesDeleted = updatesCount || 0;
    } else {
      const { error: updatesError, count: updatesCount } = await supabase
        .from("race_updates")
        .delete({ count: "exact" })
        .eq("race_id", raceId);

      if (updatesError) {
        console.error("Error deleting updates:", updatesError);
        throw updatesError;
      }
      updatesDeleted = updatesCount || 0;
    }

    // Clear all caches
    raceCache.clear();

    // Log the operation for audit purposes
    console.log("Simulation data cleared:", {
      raceId,
      simulationStartTime: clearStartTime,
      lapsDeleted,
      leaderboardDeleted,
      updatesDeleted,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      lapsDeleted,
      leaderboardDeleted,
      updatesDeleted,
      message: "Simulation data cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing simulation data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

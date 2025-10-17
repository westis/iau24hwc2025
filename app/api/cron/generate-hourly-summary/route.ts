// app/api/cron/generate-hourly-summary/route.ts
// Cron job to generate hourly race summary
// Configure in vercel.json: "schedule": "0 * * * *" (every hour on the hour)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndStoreHourlySummary } from "@/lib/ai/commentary-generator";

export const maxDuration = 60; // 60 seconds max execution time

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[HOURLY SUMMARY CRON] Starting hourly summary generation");

  try {
    const supabase = await createClient();

    // Get active race
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("id, start_time, end_time")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      console.log("[HOURLY SUMMARY CRON] No active race found");
      return NextResponse.json({
        success: true,
        message: "No active race",
      });
    }

    // Check if race is actually running
    const now = new Date();
    const startTime = new Date(activeRace.start_time);
    const endTime = new Date(activeRace.end_time);

    if (now < startTime) {
      console.log("[HOURLY SUMMARY CRON] Race hasn't started yet");
      return NextResponse.json({
        success: true,
        message: "Race not started",
      });
    }

    if (now > endTime) {
      console.log("[HOURLY SUMMARY CRON] Race has ended");
      return NextResponse.json({
        success: true,
        message: "Race ended",
      });
    }

    // Generate and store hourly summary
    await generateAndStoreHourlySummary(activeRace.id);

    console.log("[HOURLY SUMMARY CRON] Successfully generated hourly summary");

    return NextResponse.json({
      success: true,
      raceId: activeRace.id,
    });
  } catch (error) {
    console.error("[HOURLY SUMMARY CRON] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

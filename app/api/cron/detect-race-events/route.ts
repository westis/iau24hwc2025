// app/api/cron/detect-race-events/route.ts
// Cron job to detect race events every 5 minutes
// Configure in vercel.json: "schedule": "*/5 * * * *"

import { NextRequest, NextResponse } from "next/server";
import { detectRaceEvents, storeDetectedEvents } from "@/lib/ai/event-detector";

export const maxDuration = 60; // 60 seconds max execution time

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[EVENT DETECTION CRON] Starting event detection");

  try {
    // Detect events
    const events = await detectRaceEvents();

    if (events.length === 0) {
      console.log("[EVENT DETECTION CRON] No events detected");
      return NextResponse.json({
        success: true,
        eventsDetected: 0,
        message: "No events detected",
      });
    }

    // Store events in database
    await storeDetectedEvents(events);

    console.log(`[EVENT DETECTION CRON] Successfully detected and stored ${events.length} events`);

    return NextResponse.json({
      success: true,
      eventsDetected: events.length,
      eventTypes: events.map((e) => e.eventType),
    });
  } catch (error) {
    console.error("[EVENT DETECTION CRON] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

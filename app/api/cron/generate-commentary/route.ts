// app/api/cron/generate-commentary/route.ts
// Cron job to generate AI commentary for pending events every 2 minutes
// Configure in vercel.json: "schedule": "*/2 * * * *"

import { NextRequest, NextResponse } from "next/server";
import { processPendingEvents } from "@/lib/ai/commentary-generator";

export const maxDuration = 60; // 60 seconds max execution time

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[COMMENTARY GENERATION CRON] Starting commentary generation");

  try {
    // Process pending events
    const processedCount = await processPendingEvents();

    if (processedCount === 0) {
      console.log("[COMMENTARY GENERATION CRON] No pending events to process");
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending events",
      });
    }

    console.log(`[COMMENTARY GENERATION CRON] Successfully processed ${processedCount} events`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
    });
  } catch (error) {
    console.error("[COMMENTARY GENERATION CRON] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// app/api/race/updates/route.ts
// API endpoint for fetching race updates (AI commentary feed)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RaceUpdate, RaceUpdatesResponse } from "@/types/live-race";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

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

    // Parse query parameters
    const priority = searchParams.get("priority"); // 'high', 'medium', 'low', or 'all'
    const updateType = searchParams.get("type"); // 'ai', 'ai_summary', 'milestone', 'lead_change', 'manual'
    const country = searchParams.get("country"); // Filter by country code
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("race_updates")
      .select("*", { count: "exact" })
      .eq("race_id", activeRace.id)
      .order("timestamp", { ascending: false });

    // Apply filters
    if (priority && priority !== "all") {
      query = query.eq("priority", priority);
    }

    if (updateType) {
      query = query.eq("update_type", updateType);
    }

    if (country && country !== "all") {
      query = query.contains("related_countries", [country]);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: updates, error, count } = await query;

    if (error) {
      console.error("Error fetching race updates:", error);
      return NextResponse.json(
        { error: "Failed to fetch updates" },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase
    const formattedUpdates: RaceUpdate[] = (updates || []).map((update: any) => ({
      id: update.id,
      content: update.content,
      contentSv: update.content_sv,
      updateType: update.update_type,
      priority: update.priority,
      relatedBibs: update.related_bibs || [],
      relatedCountries: update.related_countries || [],
      timestamp: update.timestamp,
      createdAt: update.created_at,
    }));

    const response: RaceUpdatesResponse = {
      updates: formattedUpdates,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error in race updates GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

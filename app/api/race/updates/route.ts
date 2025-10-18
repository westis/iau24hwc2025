// app/api/race/updates/route.ts
// API endpoint for fetching race updates (AI commentary feed)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RaceUpdate, RaceUpdatesResponse } from "@/types/live-race";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (admin only)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const body = await request.json();
    const {
      content,
      contentSv,
      updateType = "manual",
      priority = "medium",
      category = "general",
      mediaType = "text",
      mediaUrl,
      mediaDescription,
      mediaCredit,
      mediaCreditUrl,
      relatedBibs = [],
      relatedCountries = [],
      allowComments = true,
      sendNotification = false,
      isSticky = false,
    } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Insert race update
    const { data: newUpdate, error } = await supabase
      .from("race_updates")
      .insert({
        race_id: activeRace.id,
        content: content.trim(),
        content_sv: contentSv?.trim() || null,
        update_type: updateType,
        priority,
        category,
        media_type: mediaType,
        media_url: mediaUrl || null,
        media_description: mediaDescription?.trim() || null,
        media_credit: mediaCredit?.trim() || null,
        media_credit_url: mediaCreditUrl?.trim() || null,
        related_bibs: relatedBibs,
        related_countries: relatedCountries,
        allow_comments: allowComments,
        is_sticky: isSticky,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating race update:", error);
      return NextResponse.json(
        { error: "Failed to create update" },
        { status: 500 }
      );
    }

    // Send push notification if requested
    if (sendNotification && (category === "urgent" || category === "summary")) {
      try {
        await fetch(`${request.nextUrl.origin}/api/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Race Update: ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            body: content.substring(0, 120),
            url: `/live/updates#${newUpdate.id}`,
          }),
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
        // Don't fail the request if notification fails
      }
    }

    // Format response
    const formattedUpdate: RaceUpdate = {
      id: newUpdate.id,
      content: newUpdate.content,
      contentSv: newUpdate.content_sv,
      updateType: newUpdate.update_type,
      priority: newUpdate.priority,
      relatedBibs: newUpdate.related_bibs || [],
      relatedCountries: newUpdate.related_countries || [],
      timestamp: newUpdate.timestamp,
      createdAt: newUpdate.created_at,
      mediaType: newUpdate.media_type,
      mediaUrl: newUpdate.media_url,
      mediaDescription: newUpdate.media_description,
      mediaCredit: newUpdate.media_credit,
      mediaCreditUrl: newUpdate.media_credit_url,
      category: newUpdate.category,
      allowComments: newUpdate.allow_comments,
      commentCount: 0,
      isSticky: newUpdate.is_sticky,
      stickyOrder: newUpdate.sticky_order,
    };

    return NextResponse.json(
      { update: formattedUpdate },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in race updates POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      // Return empty updates instead of error when no race is active
      return NextResponse.json({
        updates: [],
        totalCount: 0,
        hasMore: false,
        unreadCount: 0,
      });
    }

    // Parse query parameters
    const priority = searchParams.get("priority"); // 'high', 'medium', 'low', or 'all'
    const updateType = searchParams.get("type"); // 'ai', 'ai_summary', 'milestone', 'lead_change', 'manual'
    const category = searchParams.get("category"); // 'summary', 'urgent', 'general', 'interview', 'team_sweden', or 'all'
    const mediaType = searchParams.get("mediaType"); // 'text', 'audio', 'video', 'image', 'instagram', 'text_image'
    const country = searchParams.get("country"); // Filter by country code
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query (sticky posts first, then by timestamp)
    let query = supabase
      .from("race_updates")
      .select("*", { count: "exact" })
      .eq("race_id", activeRace.id)
      .order("is_sticky", { ascending: false })
      .order("sticky_order", { ascending: false, nullsFirst: false })
      .order("timestamp", { ascending: false });

    // Apply filters
    if (priority && priority !== "all") {
      query = query.eq("priority", priority);
    }

    if (updateType) {
      query = query.eq("update_type", updateType);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (mediaType) {
      query = query.eq("media_type", mediaType);
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

    // Get current user for unread count
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let unreadCount = 0;
    if (user) {
      // Get read update IDs for this user
      const { data: readUpdates } = await supabase
        .from("race_update_reads")
        .select("update_id")
        .eq("id", user.id);

      const readUpdateIds = new Set(
        (readUpdates || []).map((r: any) => r.update_id)
      );

      // Count unread from all updates for this race
      const { data: allUpdates } = await supabase
        .from("race_updates")
        .select("id")
        .eq("race_id", activeRace.id);

      unreadCount = (allUpdates || []).filter(
        (u: any) => !readUpdateIds.has(u.id)
      ).length;
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
      mediaType: update.media_type || "text",
      mediaUrl: update.media_url,
      mediaDescription: update.media_description,
      mediaCredit: update.media_credit,
      mediaCreditUrl: update.media_credit_url,
      category: update.category || "general",
      allowComments: update.allow_comments !== false,
      commentCount: update.comment_count || 0,
      isSticky: update.is_sticky || false,
      stickyOrder: update.sticky_order,
    }));

    const response: RaceUpdatesResponse = {
      updates: formattedUpdates,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0),
      unreadCount: user ? unreadCount : undefined,
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

// app/api/race/updates/unread-count/route.ts
// Get unread count of race updates for authenticated user

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RaceUpdateUnreadCountResponse } from "@/types/live-race";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          unreadCount: 0,
          totalCount: 0,
        } as RaceUpdateUnreadCountResponse,
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Get active race
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      return NextResponse.json(
        {
          unreadCount: 0,
          totalCount: 0,
        } as RaceUpdateUnreadCountResponse,
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Get total count of updates
    const { count: totalCount } = await supabase
      .from("race_updates")
      .select("*", { count: "exact", head: true })
      .eq("race_id", activeRace.id);

    // Count unread updates (updates without a read record for this user)
    const { data: readUpdates } = await supabase
      .from("race_update_reads")
      .select("update_id")
      .eq("user_id", user.id);

    const readUpdateIds = new Set(
      (readUpdates || []).map((r: any) => r.update_id)
    );

    const { data: allUpdates } = await supabase
      .from("race_updates")
      .select("id")
      .eq("race_id", activeRace.id);

    const unreadCount = (allUpdates || []).filter(
      (update: any) => !readUpdateIds.has(update.id)
    ).length;

    const response: RaceUpdateUnreadCountResponse = {
      unreadCount,
      totalCount: totalCount || 0,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=10, s-maxage=10",
      },
    });
  } catch (error) {
    console.error("Error in unread count GET:", error);
    return NextResponse.json(
      {
        unreadCount: 0,
        totalCount: 0,
      } as RaceUpdateUnreadCountResponse,
      {
        status: 200, // Return 200 with zero counts rather than error
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

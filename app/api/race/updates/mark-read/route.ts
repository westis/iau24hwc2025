// app/api/race/updates/mark-read/route.ts
// Mark race updates as read for authenticated user

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { updateIds } = body;

    if (!Array.isArray(updateIds) || updateIds.length === 0) {
      return NextResponse.json(
        { error: "updateIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Insert read records (use upsert to avoid duplicates)
    const readRecords = updateIds.map((updateId) => ({
      user_id: user.id,
      update_id: updateId,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("race_update_reads")
      .upsert(readRecords, {
        onConflict: "user_id,update_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Error marking updates as read:", error);
      return NextResponse.json(
        { error: "Failed to mark updates as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      markedCount: updateIds.length,
    });
  } catch (error) {
    console.error("Error in mark-read POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// app/api/race/updates/[id]/route.ts
// API endpoint for individual race update operations (GET, PATCH, DELETE)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RaceUpdate } from "@/types/live-race";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const updateId = parseInt(id);

    if (isNaN(updateId)) {
      return NextResponse.json(
        { error: "Invalid update ID" },
        { status: 400 }
      );
    }

    const { data: update, error } = await supabase
      .from("race_updates")
      .select("*")
      .eq("id", updateId)
      .single();

    if (error || !update) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    // Format response
    const formattedUpdate: RaceUpdate = {
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
      category: update.category || "general",
      allowComments: update.allow_comments !== false,
      commentCount: update.comment_count || 0,
      isSticky: update.is_sticky || false,
      stickyOrder: update.sticky_order,
    };

    return NextResponse.json({ update: formattedUpdate });
  } catch (error) {
    console.error("Error in race update GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const updateId = parseInt(id);

    if (isNaN(updateId)) {
      return NextResponse.json(
        { error: "Invalid update ID" },
        { status: 400 }
      );
    }

    // Get current user (admin only)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: chatUser } = await supabase
      .from("chat_users")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!chatUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      content,
      contentSv,
      priority,
      category,
      mediaType,
      mediaUrl,
      mediaDescription,
      allowComments,
      isSticky,
    } = body;

    // Build update object (only update provided fields)
    const updateData: any = {};
    if (content !== undefined) updateData.content = content.trim();
    if (contentSv !== undefined)
      updateData.content_sv = contentSv?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (mediaType !== undefined) updateData.media_type = mediaType;
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl || null;
    if (mediaDescription !== undefined)
      updateData.media_description = mediaDescription?.trim() || null;
    if (allowComments !== undefined) updateData.allow_comments = allowComments;
    if (isSticky !== undefined) updateData.is_sticky = isSticky;

    const { data: updatedUpdate, error } = await supabase
      .from("race_updates")
      .update(updateData)
      .eq("id", updateId)
      .select()
      .single();

    if (error) {
      console.error("Error updating race update:", error);
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 }
      );
    }

    if (!updatedUpdate) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    // Format response
    const formattedUpdate: RaceUpdate = {
      id: updatedUpdate.id,
      content: updatedUpdate.content,
      contentSv: updatedUpdate.content_sv,
      updateType: updatedUpdate.update_type,
      priority: updatedUpdate.priority,
      relatedBibs: updatedUpdate.related_bibs || [],
      relatedCountries: updatedUpdate.related_countries || [],
      timestamp: updatedUpdate.timestamp,
      createdAt: updatedUpdate.created_at,
      mediaType: updatedUpdate.media_type || "text",
      mediaUrl: updatedUpdate.media_url,
      mediaDescription: updatedUpdate.media_description,
      category: updatedUpdate.category || "general",
      allowComments: updatedUpdate.allow_comments !== false,
      commentCount: updatedUpdate.comment_count || 0,
      isSticky: updatedUpdate.is_sticky || false,
      stickyOrder: updatedUpdate.sticky_order,
    };

    return NextResponse.json({ update: formattedUpdate });
  } catch (error) {
    console.error("Error in race update PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const updateId = parseInt(id);

    if (isNaN(updateId)) {
      return NextResponse.json(
        { error: "Invalid update ID" },
        { status: 400 }
      );
    }

    // Get current user (admin only)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: chatUser } = await supabase
      .from("chat_users")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!chatUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the update (comments will cascade delete due to FK constraint)
    const { error } = await supabase
      .from("race_updates")
      .delete()
      .eq("id", updateId);

    if (error) {
      console.error("Error deleting race update:", error);
      return NextResponse.json(
        { error: "Failed to delete update" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in race update DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// app/api/race/updates/[id]/comments/[commentId]/route.ts
// Update and delete individual comments

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RaceUpdateComment } from "@/types/live-race";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id, commentId: commentIdParam } = await params;
    const updateId = parseInt(id);
    const commentId = parseInt(commentIdParam);

    if (isNaN(updateId) || isNaN(commentId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    if (comment.length > 5000) {
      return NextResponse.json(
        { error: "Comment must be 5000 characters or less" },
        { status: 400 }
      );
    }

    // Update comment (RLS policy ensures user can only update their own)
    const { data: updatedComment, error } = await supabase
      .from("race_update_comments")
      .update({
        comment: comment.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("update_id", updateId)
      .eq("user_id", user.id)
      .select(
        `
        *,
        chat_users!inner (
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating comment:", error);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    if (!updatedComment) {
      return NextResponse.json(
        { error: "Comment not found or unauthorized" },
        { status: 404 }
      );
    }

    // Format response
    const formattedComment: RaceUpdateComment = {
      id: updatedComment.id,
      updateId: updatedComment.update_id,
      userId: updatedComment.user_id,
      comment: updatedComment.comment,
      createdAt: updatedComment.created_at,
      updatedAt: updatedComment.updated_at,
      chatUsers: {
        displayName: updatedComment.chat_users.display_name,
        avatarUrl: updatedComment.chat_users.avatar_url,
      },
    };

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    console.error("Error in comment PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id, commentId: commentIdParam } = await params;
    const updateId = parseInt(id);
    const commentId = parseInt(commentIdParam);

    if (isNaN(updateId) || isNaN(commentId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Get current user
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

    const isAdmin = chatUser?.is_admin === true;

    // Delete comment (user can delete own, admin can delete any)
    let query = supabase
      .from("race_update_comments")
      .delete()
      .eq("id", commentId)
      .eq("update_id", updateId);

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error, count } = await query;

    if (error) {
      console.error("Error deleting comment:", error);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Comment not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in comment DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

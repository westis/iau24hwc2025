// app/api/race/updates/[id]/comments/route.ts
// Get and post comments for a specific race update

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  RaceUpdateComment,
  RaceUpdateCommentsResponse,
} from "@/types/live-race";

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

    // Fetch comments with user information
    const { data: comments, error, count } = await supabase
      .from("race_update_comments")
      .select(
        `
        *,
        chat_users!inner (
          display_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("update_id", updateId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    // Format response
    const formattedComments: RaceUpdateComment[] = (comments || []).map(
      (comment: any) => ({
        id: comment.id,
        updateId: comment.update_id,
        userId: comment.user_id,
        comment: comment.comment,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        chatUsers: {
          displayName: comment.chat_users.display_name,
          avatarUrl: comment.chat_users.avatar_url,
        },
      })
    );

    const response: RaceUpdateCommentsResponse = {
      comments: formattedComments,
      totalCount: count || 0,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=5, s-maxage=5",
      },
    });
  } catch (error) {
    console.error("Error in comments GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user exists in chat_users and is not banned
    const { data: chatUser } = await supabase
      .from("chat_users")
      .select("user_id, is_banned")
      .eq("user_id", user.id)
      .single();

    if (!chatUser) {
      return NextResponse.json(
        { error: "User not found in chat system" },
        { status: 403 }
      );
    }

    if (chatUser.is_banned) {
      return NextResponse.json(
        { error: "You are banned from commenting" },
        { status: 403 }
      );
    }

    // Verify the update exists and allows comments
    const { data: update } = await supabase
      .from("race_updates")
      .select("id, allow_comments")
      .eq("id", updateId)
      .single();

    if (!update) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    if (update.allow_comments === false) {
      return NextResponse.json(
        { error: "Comments are disabled for this update" },
        { status: 403 }
      );
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

    // Insert comment
    const { data: newComment, error } = await supabase
      .from("race_update_comments")
      .insert({
        update_id: updateId,
        user_id: user.id,
        comment: comment.trim(),
      })
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
      console.error("Error creating comment:", error);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    // Format response
    const formattedComment: RaceUpdateComment = {
      id: newComment.id,
      updateId: newComment.update_id,
      userId: newComment.user_id,
      comment: newComment.comment,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      chatUsers: {
        displayName: newComment.chat_users.display_name,
        avatarUrl: newComment.chat_users.avatar_url,
      },
    };

    return NextResponse.json(
      { comment: formattedComment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in comments POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

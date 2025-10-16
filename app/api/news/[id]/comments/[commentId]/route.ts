import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/news/[id]/comments/[commentId] - Delete a comment (soft delete for admins)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const commentIdNum = parseInt(commentId);

    if (isNaN(commentIdNum)) {
      return NextResponse.json(
        { error: "Invalid comment ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: chatUser } = await supabase
      .from("chat_users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!chatUser?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Soft delete the comment
    const { error: deleteError } = await supabase
      .from("news_comments")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", commentIdNum);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/news/[id]/comments/[commentId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/news/[id]/comments/[commentId] - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const commentIdNum = parseInt(commentId);

    if (isNaN(commentIdNum)) {
      return NextResponse.json(
        { error: "Invalid comment ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { comment } = body;

    if (
      !comment ||
      typeof comment !== "string" ||
      comment.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    if (comment.length > 5000) {
      return NextResponse.json(
        { error: "Comment is too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Check if user owns the comment
    const { data: existingComment } = await supabase
      .from("news_comments")
      .select("user_id, deleted_at")
      .eq("id", commentIdNum)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    if (existingComment.deleted_at) {
      return NextResponse.json(
        { error: "Cannot edit deleted comment" },
        { status: 400 }
      );
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("news_comments")
      .update({
        comment: comment.trim(),
      })
      .eq("id", commentIdNum)
      .select(
        `
        id,
        news_id,
        comment,
        created_at,
        updated_at,
        user_id,
        chat_users!news_comments_user_id_fkey (
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating comment:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error("Error in PATCH /api/news/[id]/comments/[commentId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

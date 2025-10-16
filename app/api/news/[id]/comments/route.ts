import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/news/[id]/comments - Get all comments for a news article
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json({ error: "Invalid news ID" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch comments with user information
    const { data: comments, error } = await supabase
      .from("news_comments")
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
      .eq("news_id", newsId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error in GET /api/news/[id]/comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/news/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json({ error: "Invalid news ID" }, { status: 400 });
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

    // Check if user is banned
    const { data: chatUser } = await supabase
      .from("chat_users")
      .select("is_banned")
      .eq("id", user.id)
      .single();

    if (chatUser?.is_banned) {
      return NextResponse.json(
        { error: "You are banned from commenting" },
        { status: 403 }
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

    // Insert the comment
    const { data: newComment, error: insertError } = await supabase
      .from("news_comments")
      .insert({
        news_id: newsId,
        user_id: user.id,
        comment: comment.trim(),
      })
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

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/news/[id]/comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

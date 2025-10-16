import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/news/[id]/likes - Get like count and user's like status for a news article
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

    // Get total like count
    const { count, error: countError } = await supabase
      .from("news_likes")
      .select("*", { count: "exact", head: true })
      .eq("news_id", newsId);

    if (countError) {
      console.error("Error fetching like count:", countError);
      return NextResponse.json(
        { error: "Failed to fetch likes" },
        { status: 500 }
      );
    }

    // Check if current user has liked
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userHasLiked = false;

    if (user) {
      const { data: userLike } = await supabase
        .from("news_likes")
        .select("id")
        .eq("news_id", newsId)
        .eq("user_id", user.id)
        .single();

      userHasLiked = !!userLike;
    }

    return NextResponse.json({
      count: count || 0,
      userHasLiked,
    });
  } catch (error) {
    console.error("Error in GET /api/news/[id]/likes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/news/[id]/likes - Like a news article
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
        { error: "You are banned from liking" },
        { status: 403 }
      );
    }

    // Insert the like (will fail if already exists due to unique constraint)
    const { error: insertError } = await supabase.from("news_likes").insert({
      news_id: newsId,
      user_id: user.id,
    });

    if (insertError) {
      // Check if it's a duplicate key error (already liked)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already liked this article" },
          { status: 400 }
        );
      }

      console.error("Error inserting like:", insertError);
      return NextResponse.json(
        { error: "Failed to like article" },
        { status: 500 }
      );
    }

    // Get updated count
    const { count } = await supabase
      .from("news_likes")
      .select("*", { count: "exact", head: true })
      .eq("news_id", newsId);

    return NextResponse.json(
      {
        success: true,
        count: count || 0,
        userHasLiked: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/news/[id]/likes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id]/likes - Unlike a news article
export async function DELETE(
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

    // Delete the like
    const { error: deleteError } = await supabase
      .from("news_likes")
      .delete()
      .eq("news_id", newsId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting like:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlike article" },
        { status: 500 }
      );
    }

    // Get updated count
    const { count } = await supabase
      .from("news_likes")
      .select("*", { count: "exact", head: true })
      .eq("news_id", newsId);

    return NextResponse.json({
      success: true,
      count: count || 0,
      userHasLiked: false,
    });
  } catch (error) {
    console.error("Error in DELETE /api/news/[id]/likes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



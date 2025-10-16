import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chat/profile - Get current user's chat profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: chatUser, error: chatUserError } = await supabase
      .from("chat_users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (chatUserError) {
      console.error("Error fetching chat user:", chatUserError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: chatUser });
  } catch (error) {
    console.error("Error in GET /api/chat/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/chat/profile - Update current user's chat profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, avatar_url } = body;

    const updates: any = {};
    if (display_name !== undefined) {
      if (
        typeof display_name !== "string" ||
        display_name.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "Invalid display name" },
          { status: 400 }
        );
      }
      updates.display_name = display_name.trim();
    }
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("chat_users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error in PUT /api/chat/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}






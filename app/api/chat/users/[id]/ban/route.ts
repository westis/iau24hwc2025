import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/chat/users/:id/ban - Ban a user (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: targetUserId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: chatUser, error: chatUserError } = await supabase
      .from("chat_users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (chatUserError || !chatUser || !chatUser.is_admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    // Ban user
    const { error: banError } = await supabase
      .from("chat_users")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_by: user.id,
        ban_reason: reason || null,
      })
      .eq("id", targetUserId);

    if (banError) {
      console.error("Error banning user:", banError);
      return NextResponse.json(
        { error: "Failed to ban user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/chat/users/:id/ban:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/users/:id/ban - Unban a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: targetUserId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: chatUser, error: chatUserError } = await supabase
      .from("chat_users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (chatUserError || !chatUser || !chatUser.is_admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    // Unban user
    const { error: unbanError } = await supabase
      .from("chat_users")
      .update({
        is_banned: false,
        banned_at: null,
        banned_by: null,
        ban_reason: null,
      })
      .eq("id", targetUserId);

    if (unbanError) {
      console.error("Error unbanning user:", unbanError);
      return NextResponse.json(
        { error: "Failed to unban user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/chat/users/:id/ban:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




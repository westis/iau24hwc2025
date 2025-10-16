import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function DELETE(request: NextRequest) {
  try {
    // Get the auth token from the request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      // Try to get session from cookies
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;

      // Delete user from chat_users (cascade will handle related data)
      await supabaseAdmin.from("chat_users").delete().eq("user_id", userId);

      // Delete user from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      if (deleteError) {
        console.error("Error deleting user from auth:", deleteError);
        throw deleteError;
      }

      return NextResponse.json(
        { message: "Account deleted successfully" },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { new_password } = await request.json();

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: "Lösenordet måste vara minst 6 tecken" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Du måste vara inloggad" },
        { status: 401 }
      );
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      console.error("Error updating password:", error);
      return NextResponse.json(
        { error: "Kunde inte uppdatera lösenord: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lösenord uppdaterat",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internt serverfel" }, { status: 500 });
  }
}

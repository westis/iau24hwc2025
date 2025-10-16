import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/subscriptions/confirm?token=xxx - Confirm email subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Confirmation token required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Find subscription by confirmation token
    const { data: subscription, error: fetchError } = await supabase
      .from("email_subscriptions")
      .select("id, email, confirmed")
      .eq("confirmation_token", token)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation token" },
        { status: 404 }
      );
    }

    if (subscription.confirmed) {
      return NextResponse.json({
        success: true,
        message: "Email already confirmed!",
        alreadyConfirmed: true,
      });
    }

    // Confirm the subscription
    const { error: updateError } = await supabase
      .from("email_subscriptions")
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("confirmation_token", token);

    if (updateError) {
      console.error("Error confirming subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to confirm subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email confirmed successfully! You will now receive notifications.",
      email: subscription.email,
    });
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




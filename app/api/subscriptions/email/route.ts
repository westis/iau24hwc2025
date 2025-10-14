import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

// POST /api/subscriptions/email - Subscribe to email notifications
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate unique unsubscribe token
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    // Check if email already exists
    const { data: existing } = await supabase
      .from("email_subscriptions")
      .select("id, enabled")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      if (existing.enabled) {
        return NextResponse.json(
          { message: "You are already subscribed!" },
          { status: 200 }
        );
      } else {
        // Re-enable subscription
        const { error } = await supabase
          .from("email_subscriptions")
          .update({ enabled: true, updated_at: new Date().toISOString() })
          .eq("email", email.toLowerCase());

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: "Subscription reactivated successfully!",
        });
      }
    }

    // Insert new subscription
    const { error } = await supabase.from("email_subscriptions").insert({
      email: email.toLowerCase(),
      enabled: true,
      unsubscribe_token: unsubscribeToken,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message:
        "Successfully subscribed! You'll receive email notifications for news updates.",
    });
  } catch (error) {
    console.error("Email subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to subscribe",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET /api/subscriptions/email?email=test@example.com - Check subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data } = await supabase
      .from("email_subscriptions")
      .select("enabled")
      .eq("email", email.toLowerCase())
      .single();

    return NextResponse.json({
      subscribed: data?.enabled || false,
    });
  } catch (error) {
    return NextResponse.json({
      subscribed: false,
    });
  }
}

// DELETE /api/subscriptions/email?token=xxx - Unsubscribe
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("email_subscriptions")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("unsubscribe_token", token);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from email notifications.",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}


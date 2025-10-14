import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import crypto from "crypto";

// POST /api/subscriptions/email - Subscribe to email notifications
export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Generate unique tokens
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    const confirmationToken = crypto.randomBytes(32).toString("hex");

    // Check if email already exists
    const { data: existing } = await supabase
      .from("email_subscriptions")
      .select("id, enabled, confirmed")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      if (existing.confirmed && existing.enabled) {
        return NextResponse.json(
          { message: "You are already subscribed and confirmed!" },
          { status: 200 }
        );
      } else if (!existing.confirmed) {
        // Resend confirmation email
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const confirmUrl = `${siteUrl}/confirm-subscription?token=${confirmationToken}`;
        
        // Update confirmation token
        await supabase
          .from("email_subscriptions")
          .update({ confirmation_token: confirmationToken })
          .eq("email", email.toLowerCase());

        // Send confirmation email
        await resend.emails.send({
          from: `IAU 24h WC 2025 <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
          to: email,
          subject: "Bekräfta din e-postprenumeration",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2>Välkommen till IAU 24h World Championships 2025!</h2>
              <p>Tack för att du vill prenumerera på uppdateringar om loppet.</p>
              <p>Klicka på länken nedan för att bekräfta din e-postadress:</p>
              <p style="margin: 30px 0;">
                <a href="${confirmUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Bekräfta prenumeration
                </a>
              </p>
              <p style="color: #666; font-size: 12px;">
                Om du inte begärde denna prenumeration kan du ignorera detta e-postmeddelande.
              </p>
            </div>
          `,
        });

        return NextResponse.json({
          success: true,
          message: "Confirmation email sent! Please check your inbox.",
          needsConfirmation: true,
        });
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
      confirmed: false,
      unsubscribe_token: unsubscribeToken,
      confirmation_token: confirmationToken,
    });

    if (error) throw error;

    // Send confirmation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const confirmUrl = `${siteUrl}/confirm-subscription?token=${confirmationToken}`;

    await resend.emails.send({
      from: `IAU 24h WC 2025 <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
      to: email,
      subject: "Bekräfta din e-postprenumeration",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(to right, #007bff, #0056b3); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">IAU 24h World Championships 2025</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Välkommen!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Tack för att du vill prenumerera på uppdateringar om loppet i Albi, Frankrike.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              För att börja ta emot nyheter, starttider och live-resultat, klicka på knappen nedan:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Bekräfta prenumeration
              </a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Länken är giltig i 7 dagar. Om du inte begärde denna prenumeration kan du ignorera detta e-postmeddelande.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent! Please check your inbox.",
      needsConfirmation: true,
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

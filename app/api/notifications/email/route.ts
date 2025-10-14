import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Initialize Resend with API key at runtime (not build time)
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { title, content, newsId } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "noreply@ultramarathon.se";

    // Get all active email subscriptions using service role
    const supabase = await createServiceClient();
    const { data: subscriptions, error } = await supabase
      .from("email_subscriptions")
      .select("email, unsubscribe_token")
      .eq("enabled", true);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No email subscribers to notify",
        recipients: 0,
      });
    }

    // Strip HTML tags for plain text content
    const plainText = content.replace(/<[^>]*>/g, "").substring(0, 300);

    // Construct news URL
    const newsUrl = newsId
      ? `${
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://iau24hwc2025.ultramarathon.se"
        }/news/${newsId}`
      : `${
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://iau24hwc2025.ultramarathon.se"
        }/news`;

    // Send emails (Resend supports batch sending)
    const emailPromises = subscriptions.map(async (sub) => {
      const unsubscribeUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://iau24hwc2025.ultramarathon.se"
      }/unsubscribe?token=${sub.unsubscribe_token}`;

      try {
        const { data, error } = await resend.emails.send({
          from: `IAU 24h WC 2025 <${fromEmail}>`,
          to: sub.email,
          subject: title,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">IAU 24h World Championships 2025</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Albi, France</p>
                </div>
                
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">${title}</h2>
                  
                  <div style="color: #4b5563; margin: 20px 0;">
                    ${plainText}${content.length > 300 ? "..." : ""}
                  </div>
                  
                  <a href="${newsUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500; margin-top: 10px;">
                    Läs hela nyheten →
                  </a>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Du får detta mejl för att du prenumererar på uppdateringar om IAU 24h World Championships 2025.
                    <br><br>
                    <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Avprenumerera</a>
                  </p>
                </div>
              </body>
            </html>
          `,
          text: `${title}\n\n${plainText}\n\nLäs mer: ${newsUrl}\n\n---\nAvprenumerera: ${unsubscribeUrl}`,
        });

        if (error) {
          console.error(`Failed to send to ${sub.email}:`, error);
          return { success: false, email: sub.email };
        }

        return { success: true, email: sub.email, id: data?.id };
      } catch (err) {
        console.error(`Error sending to ${sub.email}:`, err);
        return { success: false, email: sub.email };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successful} of ${subscriptions.length} emails`,
      recipients: successful,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Error sending email notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to send email notifications",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

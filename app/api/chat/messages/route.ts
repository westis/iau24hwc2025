import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiting
const messageRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userMessages = messageRateLimits.get(userId) || [];

  // Remove messages older than 60 seconds
  const recentMessages = userMessages.filter((time) => now - time < 60000);

  // Check if user has sent more than 5 messages in the last minute
  if (recentMessages.length >= 5) {
    return false;
  }

  // Add current timestamp
  recentMessages.push(now);
  messageRateLimits.set(userId, recentMessages);

  return true;
}

// GET /api/chat/messages - Fetch recent messages
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select(
        `
        *,
        user:chat_users(*)
      `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error in GET /api/chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages - Send a new message
export async function POST(request: NextRequest) {
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

    // Check if user is banned
    const { data: chatUser, error: chatUserError } = await supabase
      .from("chat_users")
      .select("is_banned")
      .eq("id", user.id)
      .single();

    if (chatUserError || !chatUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (chatUser.is_banned) {
      return NextResponse.json(
        { error: "You are banned from chat" },
        { status: 403 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait before sending another message.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 500) {
      return NextResponse.json(
        { error: "Message too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        message: trimmedMessage,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}







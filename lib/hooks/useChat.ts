"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types/chat";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";

/**
 * Hook to subscribe to real-time chat messages
 */
export function useMessages(enabled: boolean = true) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const { user } = useSupabaseAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select(
            `
            *,
            user:chat_users!chat_messages_user_id_fkey(*)
          `
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("Error fetching messages:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
        } else {
          setMessages(data as ChatMessage[]);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          // Fetch the full message with user data
          const { data } = await supabase
            .from("chat_messages")
            .select(
              `
              *,
              user:chat_users!chat_messages_user_id_fkey(*)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // Remove deleted messages from UI
          if (payload.new.deleted_at) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.new.id));
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          // Track presence for online count (only if logged in)
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, supabase, user]);

  return { messages, loading, onlineCount };
}

/**
 * Hook to send messages with rate limiting
 */
export function useSendMessage() {
  const { user } = useSupabaseAuth();
  const supabase = createClient();

  const sendMessage = useCallback(
    async (message: string) => {
      if (!user) {
        throw new Error("Must be logged in to send messages");
      }

      // Send via API route which handles rate limiting
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      return response.json();
    },
    [user]
  );

  return sendMessage;
}

/**
 * Hook to delete messages (admin only)
 */
export function useDeleteMessage() {
  const { isAdmin } = useSupabaseAuth();

  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!isAdmin) {
        throw new Error("Only admins can delete messages");
      }

      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete message");
      }

      return response.json();
    },
    [isAdmin]
  );

  return deleteMessage;
}

/**
 * Hook to ban/unban users (admin only)
 */
export function useBanUser() {
  const { isAdmin } = useSupabaseAuth();

  const banUser = useCallback(
    async (userId: string, reason?: string) => {
      if (!isAdmin) {
        throw new Error("Only admins can ban users");
      }

      const response = await fetch(`/api/chat/users/${userId}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to ban user");
      }

      return response.json();
    },
    [isAdmin]
  );

  const unbanUser = useCallback(
    async (userId: string) => {
      if (!isAdmin) {
        throw new Error("Only admins can unban users");
      }

      const response = await fetch(`/api/chat/users/${userId}/ban`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unban user");
      }

      return response.json();
    },
    [isAdmin]
  );

  return { banUser, unbanUser };
}

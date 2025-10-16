"use client";

import * as React from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatUser } from "@/types/chat";

interface SupabaseAuthContextType {
  user: User | null;
  chatUser: ChatUser | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshChatUser: () => Promise<void>;
}

const SupabaseAuthContext = React.createContext<SupabaseAuthContextType | null>(
  null
);

export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = React.useState<User | null>(null);
  const [chatUser, setChatUser] = React.useState<ChatUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  const fetchChatUser = React.useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("chat_users")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching chat user:", error);
          return null;
        }

        return data as ChatUser;
      } catch (error) {
        console.error("Error fetching chat user:", error);
        return null;
      }
    },
    [supabase]
  );

  const refreshChatUser = React.useCallback(async () => {
    if (user) {
      const chatUserData = await fetchChatUser(user.id);
      setChatUser(chatUserData);
    }
  }, [user, fetchChatUser]);

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchChatUser(session.user.id).then(setChatUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchChatUser(session.user.id).then(setChatUser);
      } else {
        setChatUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchChatUser]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/chat/verify-email`,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = chatUser?.is_admin ?? false;

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        chatUser,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshChatUser,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = React.useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return context;
}







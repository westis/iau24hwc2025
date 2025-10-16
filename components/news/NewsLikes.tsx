"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { ChatAuthPrompt } from "@/components/chat/ChatAuthPrompt";
import { cn } from "@/lib/utils";

interface NewsLikesProps {
  newsId: number;
}

export function NewsLikes({ newsId }: NewsLikesProps) {
  const { user, chatUser } = useSupabaseAuth();
  const { t } = useLanguage();
  const [likeCount, setLikeCount] = React.useState(0);
  const [userHasLiked, setUserHasLiked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [toggling, setToggling] = React.useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);

  const fetchLikes = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/news/${newsId}/likes`);
      if (!response.ok) throw new Error("Failed to fetch likes");
      const data = await response.json();
      setLikeCount(data.count);
      setUserHasLiked(data.userHasLiked);
    } catch (error) {
      console.error("Error fetching likes:", error);
    } finally {
      setLoading(false);
    }
  }, [newsId, user]);

  // Fetch likes
  React.useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  const handleToggleLike = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (chatUser?.is_banned) {
      alert(t.news.bannedFromLiking || "You are banned from liking articles");
      return;
    }

    try {
      setToggling(true);
      const method = userHasLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/news/${newsId}/likes`, {
        method,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle like");
      }

      const data = await response.json();
      setLikeCount(data.count);
      setUserHasLiked(data.userHasLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
      alert(error instanceof Error ? error.message : "Failed to toggle like");
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      {/* Auth prompt dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full">
            <ChatAuthPrompt onClose={() => setShowAuthPrompt(false)} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={userHasLiked ? "default" : "outline"}
          size="sm"
          onClick={handleToggleLike}
          disabled={loading || toggling}
          className={cn(
            "gap-2 transition-all",
            userHasLiked && "bg-red-500 hover:bg-red-600"
          )}
        >
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                userHasLiked && "fill-current"
              )}
            />
          )}
          <span>
            {likeCount}{" "}
            {likeCount === 1 ? t.news.like || "Like" : t.news.likes || "Likes"}
          </span>
        </Button>
      </div>
    </>
  );
}

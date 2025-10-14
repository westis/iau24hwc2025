"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types/chat";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";

interface MessageItemProps {
  message: ChatMessage;
  onDelete?: (messageId: number) => void;
}

export function MessageItem({ message, onDelete }: MessageItemProps) {
  const { user, isAdmin } = useSupabaseAuth();
  const isOwnMessage = user?.id === message.user_id;
  const canDelete = isAdmin;

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <div
      className={`flex gap-3 p-3 hover:bg-muted/50 rounded-lg group ${
        isOwnMessage ? "bg-primary/5" : ""
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        {message.user?.avatar_url ? (
          <img
            src={message.user.avatar_url}
            alt={message.user.display_name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm">
            {message.user?.display_name || "Anonymous"}
          </span>
          {message.user?.is_admin && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>
        <p className="text-sm break-words whitespace-pre-wrap">
          {message.message}
        </p>
      </div>
      {canDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={() => onDelete(message.id)}
          title="Delete message"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

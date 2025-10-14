"use client";

import * as React from "react";
import { MessageItem } from "./MessageItem";
import type { ChatMessage } from "@/types/chat";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  onDeleteMessage?: (messageId: number) => void;
}

export function MessageList({
  messages,
  loading,
  onDeleteMessage,
}: MessageListProps) {
  const { t } = useLanguage();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isNearBottom);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t.chat.noMessagesYet}
          </p>
          <p className="text-xs text-muted-foreground">{t.chat.firstMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2 py-3 space-y-1"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onDelete={onDeleteMessage}
        />
      ))}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="fixed bottom-20 right-6 bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs shadow-lg hover:bg-primary/90 transition-colors"
        >
          {t.chat.newMessages}
        </button>
      )}
    </div>
  );
}

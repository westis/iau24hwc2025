"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const { t } = useLanguage();
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Cooldown timer
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending || cooldown > 0) return;

    setSending(true);
    try {
      await onSendMessage(trimmedMessage);
      setMessage("");
      setCooldown(12); // 12 second cooldown between messages
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = disabled || sending || cooldown > 0;

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 space-y-2">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chat.typeMessage}
          disabled={isDisabled}
          className="min-h-[60px] max-h-[120px] resize-none"
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isDisabled || !message.trim()}
          className="h-[60px] w-[60px] flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{message.length}/500</span>
        {cooldown > 0 && (
          <span className="text-orange-600 dark:text-orange-400">
            {t.chat.waitBeforeSending.replace("{seconds}", cooldown.toString())}
          </span>
        )}
        <span className="text-muted-foreground/60">
          {t.chat.enterToSend} • {t.chat.shiftEnterNewLine}
        </span>
      </div>
    </form>
  );
}

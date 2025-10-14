"use client";

import * as React from "react";
import {
  MessageSquare,
  X,
  Minimize2,
  Users,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ChatAuthPrompt } from "./ChatAuthPrompt";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ProfileSettings } from "./ProfileSettings";
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
} from "@/lib/hooks/useChat";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const { user, chatUser, loading: authLoading, signOut } = useSupabaseAuth();
  const { t } = useLanguage();
  const {
    messages,
    loading: messagesLoading,
    onlineCount,
  } = useMessages(isOpen);
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();

  const unreadCount = 0; // TODO: Implement unread count tracking

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (window.confirm(t.chat.confirmDelete)) {
      try {
        console.log("Deleting message:", messageId);
        await deleteMessage(messageId);
        console.log("Message deleted successfully");
      } catch (error) {
        console.error("Failed to delete message:", error);
        alert("Failed to delete message: " + (error as Error).message);
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t.chat.logout + "?")) {
      await signOut();
      setIsOpen(false);
    }
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg relative"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-[400px] h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">{t.chat.title}</h3>
              {onlineCount > 0 && (
                <p className="text-xs opacity-90 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {onlineCount} {t.chat.online}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20",
                    showSettings && "bg-primary-foreground/20"
                  )}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Inställningar"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={handleLogout}
                  title={t.chat.logout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {authLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          </div>
        ) : showSettings && user ? (
          <>
            <ProfileSettings />
            <MessageList
              messages={messages}
              loading={messagesLoading}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageInput onSendMessage={handleSendMessage} disabled={!user} />
          </>
        ) : !user ? (
          <ChatAuthPrompt onClose={() => setIsOpen(false)} />
        ) : chatUser?.is_banned ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-destructive">
                {t.chat.banned}
              </p>
              {chatUser.ban_reason && (
                <p className="text-xs text-muted-foreground">
                  {t.chat.bannedReason}: {chatUser.ban_reason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              loading={messagesLoading}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageInput onSendMessage={handleSendMessage} disabled={!user} />
          </>
        )}
      </Card>
    </div>
  );
}

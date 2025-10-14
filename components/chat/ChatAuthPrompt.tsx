"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ChatAuthPromptProps {
  onClose?: () => void;
}

export function ChatAuthPrompt({ onClose }: ChatAuthPromptProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
      <div className="p-4 bg-primary/10 rounded-full">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{t.chat.joinChat}</h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {t.chat.signInDescription}
        </p>
      </div>
      <div className="flex flex-col w-full gap-2 pt-2">
        <Link href="/chat/login" className="w-full" onClick={onClose}>
          <Button className="w-full" variant="default">
            <LogIn className="mr-2 h-4 w-4" />
            {t.chat.signIn}
          </Button>
        </Link>
        <Link href="/chat/signup" className="w-full" onClick={onClose}>
          <Button className="w-full" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            {t.chat.createAccount}
          </Button>
        </Link>
      </div>
    </div>
  );
}

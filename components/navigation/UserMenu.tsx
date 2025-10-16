"use client";

import Link from "next/link";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, chatUser, signOut } = useSupabaseAuth();
  const { t } = useLanguage();

  // If not logged in, show user icon with login/signup dropdown
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent transition-colors">
            <User className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/chat/login" className="cursor-pointer flex items-center">
              <User className="h-4 w-4 mr-2" />
              {t.chat.signIn}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/chat/signup" className="cursor-pointer flex items-center">
              <User className="h-4 w-4 mr-2" />
              {t.chat.createAccount}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // If logged in, show user menu
  const displayName =
    chatUser?.display_name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity">
          <Avatar className="h-8 w-8">
            {chatUser?.avatar_url ? (
              <AvatarImage src={chatUser.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            href="/chat/profile?tab=profile"
            className="cursor-pointer flex items-center"
          >
            <User className="h-4 w-4 mr-2" />
            {t.chat.profile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/chat/profile?tab=settings"
            className="cursor-pointer flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t.chat.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer flex items-center"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t.chat.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

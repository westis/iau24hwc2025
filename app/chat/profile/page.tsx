"use client";

import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ProfileSettings } from "@/components/chat/ProfileSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading } = useSupabaseAuth();
  const { t } = useLanguage();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">{t.chat.signIn}</h1>
          <p className="text-muted-foreground mb-6">
            {t.chat.signInDescription}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/chat/login">
              <Button>{t.chat.signIn}</Button>
            </Link>
            <Link href="/chat/signup">
              <Button variant="outline">{t.chat.createAccount}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
          <h1 className="text-3xl font-bold">{t.chat.profile}</h1>
          <p className="text-muted-foreground mt-2">
            {t.chat.settings}
          </p>
        </div>

        {/* Profile Settings Component */}
        <ProfileSettings />
      </div>
    </div>
  );
}


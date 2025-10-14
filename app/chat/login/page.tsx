"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, MessageSquare } from "lucide-react";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Link from "next/link";

export default function ChatLoginPage() {
  const router = useRouter();
  const { signIn, user } = useSupabaseAuth();
  const { t } = useLanguage();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.chat.signIn}
          </CardTitle>
          <CardDescription>{t.chat.signInDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign-In - Commented out for now */}
            {/* <GoogleSignInButton redirectTo="/" /> */}

            {/* <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Eller med e-post
                </span>
              </div>
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="email">{t.chat.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.chat.emailPlaceholder}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.chat.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.chat.passwordPlaceholder}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.chat.signingIn : t.chat.signIn}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t.chat.dontHaveAccount}{" "}
              <Link
                href="/chat/signup"
                className="text-primary hover:underline"
              >
                {t.chat.createAccount}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

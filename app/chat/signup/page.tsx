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
import { AlertCircle, MessageSquare, CheckCircle } from "lucide-react";
import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Link from "next/link";

export default function ChatSignupPage() {
  const router = useRouter();
  const { signUp, user } = useSupabaseAuth();
  const { t } = useLanguage();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [honeypot, setHoneypot] = React.useState(""); // Bot protection
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (user && !success) {
      router.push("/");
    }
  }, [user, success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      console.log("Bot detected via honeypot");
      // Silently fail for bots (don't show error)
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, displayName);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {t.chat.checkYourEmail}
            </CardTitle>
            <CardDescription>{t.chat.checkEmailDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                {t.chat.verifyEmailInstructions}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Efter att du har verifierat din e-post kan du logga in och gå med
              i chatten.
            </p>
            <Button
              onClick={() => router.push("/chat/login")}
              className="w-full"
            >
              {t.chat.goToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.chat.createAccount}
          </CardTitle>
          <CardDescription>{t.chat.createAccountDescription}</CardDescription>
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
              <Label htmlFor="displayName">{t.chat.displayName}</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.chat.displayNamePlaceholder}
                required
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.chat.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.chat.emailPlaceholder}
                required
              />
              <p className="text-xs text-muted-foreground">
                Du måste verifiera din e-postadress
              </p>
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
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                {t.chat.passwordMinLength}
              </p>
            </div>

            {/* Honeypot field - hidden from real users */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <Label htmlFor="website">Webbplats (lämna tomt)</Label>
              <Input
                id="website"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.chat.creatingAccount : t.chat.signUp}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t.chat.alreadyHaveAccount}{" "}
              <Link href="/chat/login" className="text-primary hover:underline">
                {t.chat.signIn}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

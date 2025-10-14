"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function NotificationBanner() {
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem("notificationBannerDismissed");
    const emailSubscribed = localStorage.getItem("emailSubscribed");

    // Show banner if not dismissed and not already subscribed
    if (!dismissed && !emailSubscribed) {
      // Wait a bit before showing to not be annoying
      setTimeout(() => setShowBanner(true), 3000);
    }

    // Check push notification support
    if (typeof window !== "undefined" && window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          const supported = OneSignal.Notifications.isPushSupported();
          setIsPushSupported(supported);
          if (supported) {
            const permission = OneSignal.Notifications.permission;
            setIsPushSubscribed(permission);
          }
        } catch (error) {
          console.error("Error checking push support:", error);
        }
      });
    }
  }, []);

  const handleEmailSubscribe = async () => {
    if (!email || !email.includes("@")) {
      setErrorMessage("Ange en giltig e-postadress");
      setSubscriptionStatus("error");
      return;
    }

    setIsSubscribing(true);
    setSubscriptionStatus("idle");

    try {
      const response = await fetch("/api/subscriptions/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscriptionStatus("success");
        localStorage.setItem("emailSubscribed", "true");
        // Hide banner after 3 seconds
        setTimeout(() => setShowBanner(false), 3000);
      } else {
        setSubscriptionStatus("error");
        setErrorMessage(data.error || "Ett fel uppstod");
      }
    } catch (error) {
      setSubscriptionStatus("error");
      setErrorMessage("Kunde inte prenumerera. Försök igen.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handlePushSubscribe = async () => {
    if (typeof window === "undefined" || !window.OneSignalDeferred) {
      alert("Push-notiser är inte tillgängliga. Fortsätt med e-post istället.");
      return;
    }

    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        // Check if push is supported
        const isPushSupported = OneSignal.Notifications.isPushSupported();
        if (!isPushSupported) {
          alert("Push-notiser stöds inte i din webbläsare. Använd e-post istället.");
          return;
        }

        // Check current permission state
        const currentPermission = OneSignal.Notifications.permission;
        
        if (currentPermission === false) {
          // Permission previously denied
          alert(
            "Push-notiser är blockerade. Aktivera dem i dina webbläsarinställningar:\n\n" +
            "Chrome/Edge: Klicka på hänglåset → Webbplatsinställningar → Notiser\n" +
            "Firefox: Klicka på skölden → Behörigheter → Notiser"
          );
          return;
        }

        // Show the permission prompt
        await OneSignal.Slidedown.promptPush();
        
        // Wait a bit for user to respond
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check the new permission state
        const newPermission = OneSignal.Notifications.permission;
        setIsPushSubscribed(newPermission);
        
        if (newPermission) {
          alert("Push-notiser aktiverade! Du får nu notiser även när webbläsaren är stängd.");
        } else {
          alert("Du behöver tillåta notiser i popup-fönstret för att aktivera push-notiser.");
        }
      } catch (error) {
        console.error("Error subscribing to push:", error);
        alert("Något gick fel. Försök igen eller använd e-post istället.");
      }
    });
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("notificationBannerDismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-[480px] z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-gradient-to-br from-primary to-primary/90 dark:from-primary/20 dark:to-primary/10 backdrop-blur-sm text-primary-foreground dark:text-foreground rounded-lg shadow-2xl border border-primary-foreground/20 dark:border-border p-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-primary-foreground/20 dark:hover:bg-accent rounded-full transition-colors"
          aria-label="Stäng"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="bg-primary-foreground/20 dark:bg-primary/20 p-2 rounded-lg">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Missa inga uppdateringar!
            </h3>
            <p className="text-sm opacity-90">
              Få meddelanden om nyheter, starttider och live-resultat
            </p>
          </div>
        </div>

        {subscriptionStatus === "success" ? (
          <div className="flex items-center gap-2 bg-green-500/20 text-green-900 dark:text-green-100 p-3 rounded-lg">
            <Check className="h-5 w-5" />
            <span className="font-medium">Tack för din prenumeration!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Email Subscription */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-post (rekommenderas)
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEmailSubscribe();
                  }}
                  className="flex-1 bg-primary-foreground/10 dark:bg-background/50 border-primary-foreground/20 dark:border-border placeholder:text-muted-foreground"
                  disabled={isSubscribing}
                />
                <Button
                  onClick={handleEmailSubscribe}
                  disabled={isSubscribing}
                  className="bg-primary-foreground text-primary dark:bg-primary dark:text-primary-foreground hover:opacity-90"
                >
                  {isSubscribing ? "..." : "Prenumerera"}
                </Button>
              </div>
              {subscriptionStatus === "error" && (
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              )}
            </div>

            {/* Push Notification Option */}
            {isPushSupported && !isPushSubscribed && (
              <div className="pt-2 border-t border-primary-foreground/20 dark:border-border">
                <Button
                  onClick={handlePushSubscribe}
                  variant="ghost"
                  size="sm"
                  className="w-full hover:bg-primary-foreground/10 dark:hover:bg-accent gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Aktivera push-notiser (desktop/Android)
                </Button>
              </div>
            )}

            <p className="text-xs opacity-70">
              Fungerar på alla enheter. Avprenumerera när som helst.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Mail } from "lucide-react";

function ConfirmSubscriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "already_confirmed" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ogiltig bekräftelselänk. Token saknas.");
      return;
    }

    const confirmSubscription = async () => {
      try {
        const response = await fetch(
          `/api/subscriptions/confirm?token=${token}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Misslyckades att bekräfta prenumeration");
        }

        if (data.alreadyConfirmed) {
          setStatus("already_confirmed");
          setMessage("Din e-postadress är redan bekräftad!");
        } else {
          setStatus("success");
          setMessage(data.message || "E-post bekräftad!");
          setEmail(data.email || "");
          
          // Store confirmed status in localStorage
          localStorage.setItem("emailSubscribed", "true");
        }
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Ett oväntat fel uppstod. Kontakta support om problemet kvarstår."
        );
      }
    };

    confirmSubscription();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            {status === "loading" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Bekräftar...</span>
              </>
            )}
            {(status === "success" || status === "already_confirmed") && (
              <>
                <Check className="h-6 w-6 text-green-600" />
                <span>Bekräftad!</span>
              </>
            )}
            {status === "error" && (
              <>
                <X className="h-6 w-6 text-red-600" />
                <span>Fel</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <p className="text-muted-foreground">
              Vänligen vänta medan vi bekräftar din e-postadress...
            </p>
          )}

          {status === "success" && (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Mail className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <p className="font-medium text-green-900 dark:text-green-100">
                  {message}
                </p>
                {email && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    {email}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Du kommer nu att få e-postmeddelanden om nyheter, starttider och
                live-resultat från IAU 24h World Championships 2025 i Albi.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="w-full"
                size="lg"
              >
                Gå till startsidan
              </Button>
            </>
          )}

          {status === "already_confirmed" && (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Check className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {message}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Du prenumererar redan på uppdateringar från IAU 24h WC 2025.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="w-full"
                size="lg"
              >
                Gå till startsidan
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <X className="h-12 w-12 mx-auto mb-3 text-red-600" />
                <p className="font-medium text-red-900 dark:text-red-100 mb-2">
                  {message}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Länken kan ha upphört att gälla eller redan ha använts.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="flex-1"
                >
                  Startsida
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="flex-1"
                >
                  Försök igen
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <Card className="w-full max-w-md text-center shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Laddar...</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ConfirmSubscriptionContent />
    </Suspense>
  );
}


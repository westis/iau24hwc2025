"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ogiltig avprenumerationslänk");
      return;
    }

    async function unsubscribe() {
      try {
        const response = await fetch(
          `/api/subscriptions/email?token=${token}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(
            "Du har avprenumererats från e-postnotiser. Du kan när som helst prenumerera igen från startsidan."
          );
        } else {
          setStatus("error");
          setMessage(data.error || "Kunde inte avprenumerera");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Ett fel uppstod. Försök igen senare.");
      }
    }

    unsubscribe();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {status === "success" && (
              <Check className="h-5 w-5 text-green-600" />
            )}
            {status === "error" && <X className="h-5 w-5 text-red-600" />}
            Avprenumerera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <p className="text-muted-foreground">Avprenumererar...</p>
          )}

          {status === "success" && (
            <>
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <p className="text-green-800 dark:text-green-200">{message}</p>
              </div>
              <Link href="/">
                <Button className="w-full">Tillbaka till startsidan</Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{message}</p>
              </div>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Tillbaka till startsidan
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}








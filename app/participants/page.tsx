"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth/auth-context";
import { RunnersView } from "@/components/participants/RunnersView";
import { TeamsView } from "@/components/participants/TeamsView";
import { SocialView } from "@/components/participants/SocialView";

function ParticipantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "individual" | "teams" | "social"
  >(() => {
    const v = searchParams.get("view");
    if (v === "teams") return "teams";
    if (v === "social") return "social";
    return "individual";
  });

  const [gender, setGender] = useState<"M" | "W">(() => {
    const g = searchParams.get("gender");
    return g === "W" ? "W" : "M";
  });

  const [country, setCountry] = useState<string>(() => {
    return searchParams.get("country") || "all";
  });

  const [metric, setMetric] = useState<"last-3-years" | "all-time">(() => {
    const m = searchParams.get("metric");
    return m === "all-time" ? "all-time" : "last-3-years";
  });

  // Sync state with URL changes
  useEffect(() => {
    const v = searchParams.get("view");
    const g = searchParams.get("gender");
    const c = searchParams.get("country");
    const m = searchParams.get("metric");

    if (v === "teams" || v === "individual" || v === "social")
      setActiveTab(v);
    if (g === "W" || g === "M") setGender(g);
    if (c !== null) setCountry(c);
    if (m === "all-time" || m === "last-3-years") setMetric(m);
  }, [searchParams]);

  // Update URL when parameters change
  const updateURL = (params: {
    view?: "individual" | "teams" | "social";
    gender?: "M" | "W";
    country?: string;
    metric?: "last-3-years" | "all-time";
  }) => {
    const newParams = new URLSearchParams();
    newParams.set("view", params.view !== undefined ? params.view : activeTab);
    newParams.set(
      "gender",
      params.gender !== undefined ? params.gender : gender
    );
    const newCountry = params.country !== undefined ? params.country : country;
    if (newCountry !== "all") {
      newParams.set("country", newCountry);
    }
    const newMetric = params.metric !== undefined ? params.metric : metric;
    newParams.set("metric", newMetric);
    router.push(`/participants?${newParams.toString()}`, { scroll: false });
  };

  const handleTabChange = (value: string) => {
    const newTab = value as "individual" | "teams" | "social";
    setActiveTab(newTab);
    updateURL({ view: newTab });
  };

  const handleGenderChange = (newGender: "M" | "W") => {
    setGender(newGender);
    updateURL({ gender: newGender });
  };

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    updateURL({ country: newCountry });
  };

  const handleMetricChange = (newMetric: "last-3-years" | "all-time") => {
    setMetric(newMetric);
    updateURL({ metric: newMetric });
  };

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.participants.title}</h1>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => router.push("/admin/runners/quick-edit")}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Quick Edit
            </Button>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="individual">
              {t.participants.individual}
            </TabsTrigger>
            <TabsTrigger value="teams">{t.participants.teams}</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="mt-0">
            <RunnersView
              initialGender={gender}
              initialCountry={country}
              initialMetric={metric}
              onGenderChange={handleGenderChange}
              onCountryChange={handleCountryChange}
              onMetricChange={handleMetricChange}
              showHeader={false}
            />
          </TabsContent>

          <TabsContent value="teams" className="mt-0">
            <TeamsView
              initialGender={gender}
              initialMetric={metric}
              onGenderChange={handleGenderChange}
              onMetricChange={handleMetricChange}
              showHeader={false}
            />
          </TabsContent>

          <TabsContent value="social" className="mt-0">
            <SocialView
              initialGender={gender}
              initialCountry={country}
              onGenderChange={handleGenderChange}
              onCountryChange={handleCountryChange}
              showHeader={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ParticipantsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<ParticipantsPageFallback />}>
      <ParticipantsPageContent />
    </Suspense>
  );
}

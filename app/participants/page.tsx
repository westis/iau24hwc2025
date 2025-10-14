"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit3, Newspaper, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth/auth-context";
import { RunnersView } from "@/components/participants/RunnersView";
import { TeamsView } from "@/components/participants/TeamsView";
import { SocialView } from "@/components/participants/SocialView";
import Link from "next/link";

function ParticipantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<"individual" | "teams" | "social">(
    () => {
      const v = searchParams.get("view");
      if (v === "teams") return "teams";
      if (v === "social") return "social";
      return "individual";
    }
  );

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

    if (v === "teams" || v === "individual" || v === "social") setActiveTab(v);
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

  // Preview article links - configure these to match your news article IDs
  const previewLinks = {
    men: "/news/1", // Replace with actual men's preview article ID
    women: "/news/2", // Replace with actual women's preview article ID
  };

  return (
    <main className="min-h-screen py-6 sm:py-8 lg:py-10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t.participants.title}</h1>
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

        {/* Preview Article Banner */}
        {activeTab === "individual" && (
          <Link
            href={gender === "M" ? previewLinks.men : previewLinks.women}
            className="block mb-6"
          >
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-all hover:shadow-md group">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Newspaper className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {gender === "M" ? t.participants.previewMen : t.participants.previewWomen}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.participants.readPreview}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </div>
          </Link>
        )}

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
            <TabsTrigger value="social">{t.participants.media}</TabsTrigger>
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

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

  // Fetch preview articles
  const [previews, setPreviews] = useState<{
    men?: { title: string; preview_url: string } | null;
    women?: { title: string; preview_url: string } | null;
  }>({});

  useEffect(() => {
    async function fetchPreviews() {
      try {
        const response = await fetch("/api/news/previews");
        const data = await response.json();
        setPreviews(data);
      } catch (error) {
        console.error("Failed to fetch previews:", error);
      }
    }
    fetchPreviews();
  }, []);

  return (
    <main className="min-h-screen py-6 sm:py-8 lg:py-10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            {t.participants.title}
          </h1>
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

        {/* Preview Article Banner - Only shows if preview exists */}
        {(activeTab === "individual" || activeTab === "teams") && (
          <>
            {gender === "M" && previews.men?.preview_url && (
              <a
                href={previews.men.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4"
              >
                <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg p-3 hover:border-primary/40 transition-all hover:shadow-sm group">
                  <div className="flex items-center gap-2.5">
                    <Newspaper className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                      {previews.men.title}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </div>
              </a>
            )}
            {gender === "W" && previews.women?.preview_url && (
              <a
                href={previews.women.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4"
              >
                <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg p-3 hover:border-primary/40 transition-all hover:shadow-sm group">
                  <div className="flex items-center gap-2.5">
                    <Newspaper className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                      {previews.women.title}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </div>
              </a>
            )}
          </>
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

"use client";

import * as React from "react";
import { Suspense } from "react";
import { LiveNavigation } from "@/components/live/LiveNavigation";
import { RaceUpdateCard } from "@/components/live/RaceUpdateCard";
import { RaceClock } from "@/components/live/RaceClock";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import type { RaceUpdate, RaceUpdateCategory } from "@/types/live-race";

function RaceUpdatesContent() {
  const { t } = useLanguage();
  const { user } = useSupabaseAuth();

  const [updates, setUpdates] = React.useState<RaceUpdate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    React.useState<RaceUpdateCategory | "all">("all");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [readUpdateIds, setReadUpdateIds] = React.useState<Set<number>>(
    new Set()
  );
  const [hasNewUpdates, setHasNewUpdates] = React.useState(false);
  const [raceInfo, setRaceInfo] = React.useState<any>(null);

  // Fetch updates
  const fetchUpdates = React.useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const params = new URLSearchParams();
        if (selectedCategory !== "all") {
          params.set("category", selectedCategory);
        }
        params.set("limit", "100");

        const res = await fetch(`/api/race/updates?${params}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch updates`);
        }

        const data = await res.json();
        const newUpdates = data.updates || [];

        // Check if there are new updates
        if (updates.length > 0 && newUpdates.length > 0) {
          const latestId = updates[0]?.id || 0;
          const hasNew = newUpdates.some((u: RaceUpdate) => u.id > latestId);
          setHasNewUpdates(hasNew);
        }

        setUpdates(newUpdates);
        setUnreadCount(data.unreadCount || 0);
        setError(null);
      } catch (err) {
        console.error("Error fetching updates:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load updates"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, updates]
  );

  // Fetch race info
  React.useEffect(() => {
    async function fetchRaceInfo() {
      try {
        const res = await fetch("/api/race/info");
        if (res.ok) {
          const data = await res.json();
          setRaceInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch race info:", err);
      }
    }
    fetchRaceInfo();
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchUpdates();
  }, [selectedCategory]);

  // Poll for new updates every 15 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchUpdates(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchUpdates]);

  // Mark update as read
  const handleMarkAsRead = React.useCallback(
    async (updateId: number) => {
      if (!user || readUpdateIds.has(updateId)) return;

      try {
        const res = await fetch("/api/race/updates/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updateIds: [updateId] }),
        });

        if (res.ok) {
          setReadUpdateIds((prev) => new Set([...prev, updateId]));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    },
    [user, readUpdateIds]
  );

  // Handle update deletion
  const handleDeleteUpdate = React.useCallback(
    (updateId: number) => {
      setUpdates((prev) => prev.filter((update) => update.id !== updateId));
      // Also decrease unread count if it was unread
      if (!readUpdateIds.has(updateId)) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [readUpdateIds]
  );

  const handleRefresh = () => {
    setHasNewUpdates(false);
    fetchUpdates(false);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setHasNewUpdates(false);
    fetchUpdates(false);
  };

  const categories: Array<RaceUpdateCategory | "all"> = [
    "all",
    "urgent",
    "summary",
    "team_sweden",
    "interview",
    "general",
  ];

  const getCategoryLabel = (category: RaceUpdateCategory | "all") => {
    const labels: Record<RaceUpdateCategory | "all", string> = {
      all: t.live?.all || "Alla",
      urgent: t.live?.urgent || "Brådskande",
      summary: t.live?.summary || "Sammanfattning",
      team_sweden: t.live?.teamSweden || "Team Sverige",
      interview: t.live?.interview || "Intervju",
      general: t.live?.general || "Allmänt",
    };
    return labels[category];
  };

  if (loading && updates.length === 0) {
    return (
      <>
        <PageTitle title={t.live?.updates || "Race Updates"} />
        <div className="min-h-screen bg-background">
          <LiveNavigation />
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title={t.live?.updates || "Race Updates"} />
        <div className="min-h-screen bg-background">
          <LiveNavigation />
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t.common?.error || "Error"}
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchUpdates()}>
                {t.common?.retry || "Try Again"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t.live?.updates || "Race Updates"} />
      <div className="min-h-screen bg-background">
        <LiveNavigation />

        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Header with filters */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold flex items-baseline gap-1 sm:gap-2 min-w-0">
                <span className="truncate">{t.live?.updates || "Updates"}</span>
                {user && unreadCount > 0 && (
                  <span className="text-sm sm:text-lg text-muted-foreground font-normal whitespace-nowrap">
                    ({unreadCount})
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {raceInfo && <RaceClock race={raceInfo} />}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="ml-2 hidden sm:inline">{t.common?.refresh || "Uppdatera"}</span>
              </Button>
            </div>
          </div>

          {/* Category filters */}
          <Tabs
            value={selectedCategory}
            onValueChange={(v) =>
              setSelectedCategory(v as RaceUpdateCategory | "all")
            }
          >
            <div
              className="overflow-x-auto scroll-smooth -mx-4 px-4 pb-1 custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'hsl(var(--border)) transparent',
              }}
            >
              <TabsList className="inline-flex w-auto">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="whitespace-nowrap flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm"
                  >
                    {getCategoryLabel(category)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          {/* New updates banner */}
          {hasNewUpdates && (
            <div className="sticky top-16 z-10">
              <Button
                onClick={handleScrollToTop}
                className="w-full shadow-lg"
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t.live?.newUpdatesAvailable || "New updates available - Click to refresh"}
              </Button>
            </div>
          )}

          {/* Updates feed */}
          {updates.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {t.live?.noUpdates || "No updates yet"}
              </h3>
              <p className="text-muted-foreground">
                {t.live?.noUpdatesMessage ||
                  "Updates will appear here during the race"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <RaceUpdateCard
                  key={update.id}
                  update={update}
                  onMarkAsRead={user ? handleMarkAsRead : undefined}
                  isRead={readUpdateIds.has(update.id)}
                  onDelete={handleDeleteUpdate}
                />
              ))}
            </div>
          )}

          {/* Load more (if needed) */}
          {updates.length > 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t.live?.showing || "Showing"} {updates.length}{" "}
              {t.live?.updates?.toLowerCase() || "updates"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function RaceUpdatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <RaceUpdatesContent />
    </Suspense>
  );
}

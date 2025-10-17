"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Users, Trophy, Newspaper, Activity } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RaceCountdown } from "@/components/race/RaceCountdown";
import type { NewsItem } from "@/types/news";
import type { RaceState } from "@/types/live-race";

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [raceState, setRaceState] = useState<RaceState>("not_started");
  const [loadingRaceState, setLoadingRaceState] = useState(true);

  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchNews() {
      try {
        // No cache to ensure fresh data after admin updates
        const response = await fetch("/api/news", { cache: "no-store" });
        const data = await response.json();
        // Get only the 3 most recent news items
        setNews(data.news.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoadingNews(false);
      }
    }

    fetchNews();
  }, []);

  useEffect(() => {
    async function fetchRaceState() {
      try {
        const response = await fetch("/api/race");
        const data = await response.json();

        // Calculate race state based on current time
        const now = new Date();
        const startTime = new Date(data.start_time);
        const endTime = new Date(data.end_time);

        let calculatedState: RaceState = "not_started";
        if (now >= endTime) {
          calculatedState = "finished";
        } else if (now >= startTime) {
          calculatedState = "live";
        }

        setRaceState(calculatedState);
      } catch (error) {
        console.error("Failed to fetch race info:", error);
      } finally {
        setLoadingRaceState(false);
      }
    }

    fetchRaceState();
    // Poll race state every 30 seconds to detect when race starts
    const interval = setInterval(fetchRaceState, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              {t.home.title}
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground mb-8">
              {t.home.subtitle}
            </p>

            {/* Countdown or Live Link */}
            {!loadingRaceState && (raceState === "live" || raceState === "finished") ? (
              // Race has started - show large prominent live link
              <div className="mb-8">
                <Link href="/live">
                  <Button
                    size="lg"
                    className="text-2xl md:text-4xl font-bold py-8 px-12 h-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Activity className="w-8 h-8 md:w-12 md:h-12 mr-3 md:mr-4" />
                    {raceState === "finished" ? t.race.viewLiveResults : t.race.raceInProgress}
                  </Button>
                </Link>
              </div>
            ) : (
              // Race hasn't started - show smaller countdown with live link
              <div className="mb-8 space-y-4">
                <Link href="/live">
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg font-semibold mb-4 hover:bg-primary/10 border-2"
                  >
                    <Activity className="w-5 h-5 mr-2" />
                    {t.race.liveResults}
                  </Button>
                </Link>
                <div className="p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50">
                  <RaceCountdown
                    targetDate="2025-10-18T10:00:00+02:00"
                    size="medium"
                  />
                </div>
              </div>
            )}

            {/* Official Links */}
            <div className="flex flex-wrap justify-center gap-3 text-sm md:text-base mb-6">
              <a
                href="https://iau-ultramarathon.org/2025-iau-24h-world-championships/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {t.home.officialIAU} <ExternalLink className="h-4 w-4" />
              </a>
              <span className="text-muted-foreground/50">•</span>
              <a
                href="https://www.albi24h.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {t.home.organizerWebsite} <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Quick Links */}
            <div className="flex gap-3">
              <Link href="/participants?view=individual">
                <Button variant="default" size="lg" className="font-semibold">
                  <Users className="w-5 h-5 mr-2" />
                  {t.home.individualRunners}
                </Button>
              </Link>
              <Link href="/participants?view=teams">
                <Button variant="default" size="lg" className="font-semibold">
                  <Trophy className="w-5 h-5 mr-2" />
                  {t.home.teamPredictions}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
        {/* Latest News Section */}
        {!loadingNews && news.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                  {t.home.latestNews}
                </h2>
              </div>
              <Link href="/news">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm sm:text-base"
                >
                  {t.home.viewAllNews} →
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {news.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-3 hover:bg-accent rounded-md transition-colors"
                >
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground min-w-[70px] sm:min-w-[90px]">
                    {new Date(
                      item.published_at || item.created_at
                    ).toLocaleDateString(
                      language === "sv" ? "sv-SE" : "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                  <Link
                    href="/news"
                    className="text-sm sm:text-base lg:text-lg hover:underline flex-1"
                  >
                    {item.title}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

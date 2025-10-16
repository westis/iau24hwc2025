"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeHtml } from "@/components/safe-html";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Heart, MessageSquare } from "lucide-react";
import type { NewsItem } from "@/types/news";
import { PageTitle } from "@/components/PageTitle";

interface Runner {
  id: number;
  firstname: string;
  lastname: string;
  entryId: string;
}

interface NewsStats {
  [newsId: number]: {
    likeCount: number;
    commentCount: number;
  };
}

export default function NewsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [newsStats, setNewsStats] = useState<NewsStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch news with runner links
        const newsResponse = await fetch("/api/news?includeRunnerLinks=true");
        if (!newsResponse.ok) {
          throw new Error("Failed to fetch news");
        }
        const newsData = await newsResponse.json();
        const newsItems = newsData.news;
        setNews(newsItems);

        // Fetch runners
        const runnersResponse = await fetch("/api/runners");
        const runnersData = await runnersResponse.json();
        setRunners(runnersData.runners || []);

        // Fetch stats for each news item
        const stats: NewsStats = {};
        await Promise.all(
          newsItems.map(async (item: NewsItem) => {
            try {
              const [likesRes, commentsRes] = await Promise.all([
                fetch(`/api/news/${item.id}/likes`),
                fetch(`/api/news/${item.id}/comments`),
              ]);

              const likesData = await likesRes.json();
              const commentsData = await commentsRes.json();

              stats[item.id] = {
                likeCount: likesData.count || 0,
                commentCount: commentsData.comments?.length || 0,
              };
            } catch (err) {
              console.error(`Error fetching stats for news ${item.id}:`, err);
              stats[item.id] = { likeCount: 0, commentCount: 0 };
            }
          })
        );
        setNewsStats(stats);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load news");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t.common.error}: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle title={language === "sv" ? "Nyheter" : "News"} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-10 max-w-5xl lg:max-w-6xl">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          {t.news.title}
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-2">
          {t.news.subtitle}
        </p>
      </div>

      {/* News Items */}
      <div className="space-y-6">
        {news.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>{t.news.noNews}</p>
              <p className="text-sm mt-2">{t.news.checkBackLater}</p>
            </CardContent>
          </Card>
        ) : (
          news.map((item) => {
            const linkedRunners = item.linkedRunnerIds
              ? runners.filter((r) => item.linkedRunnerIds?.includes(r.id))
              : [];
            const stats = newsStats[item.id] || {
              likeCount: 0,
              commentCount: 0,
            };

            return (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/news/${item.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(
                        language === "sv" ? "sv-SE" : "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                    {/* Like and Comment counts */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        <span>{stats.likeCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{stats.commentCount}</span>
                      </div>
                    </div>
                    {linkedRunners.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {linkedRunners.map((runner) => (
                          <Link
                            key={runner.id}
                            href={`/runners/${runner.entryId}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-secondary/80"
                            >
                              {runner.firstname} {runner.lastname}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <SafeHtml
                    html={item.content}
                    className="text-sm sm:text-base lg:text-lg leading-relaxed line-clamp-3"
                  />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      </main>
    </>
  );
}

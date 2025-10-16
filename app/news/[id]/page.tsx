"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeHtml } from "@/components/safe-html";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArrowLeft } from "lucide-react";
import type { NewsItem } from "@/types/news";
import { NewsComments } from "@/components/news/NewsComments";
import { NewsLikes } from "@/components/news/NewsLikes";

interface Runner {
  id: number;
  firstname: string;
  lastname: string;
  entryId: string;
}

export default function NewsArticlePage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [runners, setRunners] = useState<Runner[]>([]);
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
        const item = newsData.news.find(
          (n: NewsItem) => n.id === Number(params.id)
        );

        if (!item) {
          throw new Error("News item not found");
        }

        setNewsItem(item);

        // Fetch runners
        const runnersResponse = await fetch("/api/runners");
        const runnersData = await runnersResponse.json();
        setRunners(runnersData.runners || []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load news");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

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

  if (error || !newsItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t.common.error}: {error || "News not found"}
          </p>
          <Button onClick={() => router.push("/news")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.news.backToNews}
          </Button>
        </div>
      </div>
    );
  }

  const linkedRunners = newsItem.linkedRunnerIds
    ? runners.filter((r) => newsItem.linkedRunnerIds?.includes(r.id))
    : [];

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-10 max-w-5xl lg:max-w-6xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/news")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.news.backToNews}
        </Button>
      </div>

      {/* Article */}
      <Card className="hover:shadow-md transition-shadow mb-6">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
            {newsItem.title}
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
              {new Date(newsItem.created_at).toLocaleDateString(
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
            {linkedRunners.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {linkedRunners.map((runner) => (
                  <Link key={runner.id} href={`/runners/${runner.entryId}`}>
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
            html={newsItem.content}
            className="text-sm sm:text-base lg:text-lg leading-relaxed lg:leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Likes Section */}
      <div className="mb-6">
        <NewsLikes newsId={newsItem.id} />
      </div>

      {/* Comments Section */}
      <NewsComments newsId={newsItem.id} />
    </main>
  );
}

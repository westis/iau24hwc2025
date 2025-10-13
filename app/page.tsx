'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Users, Trophy, Newspaper } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { RaceCountdown } from '@/components/race/RaceCountdown'
import type { NewsItem } from '@/types/news'

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

  const { t, language } = useLanguage()

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/api/news')
        const data = await response.json()
        // Get only the 3 most recent news items
        setNews(data.news.slice(0, 3))
      } catch (error) {
        console.error('Failed to fetch news:', error)
      } finally {
        setLoadingNews(false)
      }
    }

    fetchNews()
  }, [])

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

            {/* Countdown */}
            <div className="mb-8 p-6 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50">
              <RaceCountdown
                targetDate="2025-10-18T10:00:00+02:00"
                size="large"
              />
            </div>

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Latest News Section */}
        {!loadingNews && news.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">{t.home.latestNews}</h2>
              </div>
              <Link href="/news">
                <Button variant="ghost" size="sm" className="text-sm">
                  {t.home.viewAllNews} →
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {news.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 px-3 hover:bg-accent rounded-md transition-colors">
                  <span className="text-xs text-muted-foreground min-w-[70px]">
                    {new Date(item.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <Link href="/news" className="text-sm hover:underline flex-1">
                    {item.title}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

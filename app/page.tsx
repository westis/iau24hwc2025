'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Users, Trophy, Newspaper } from 'lucide-react'
import type { NewsItem } from '@/types/news'

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

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
      {/* Hero Section with Banner */}
      <div className="relative w-full h-[200px] md:h-[280px]">
        <Image
          src="https://www.albi24h.fr/wp-content/uploads/2025/04/ALBI24H2025-EN.jpg"
          alt="IAU 24h World Championships 2025 - Albi, France"
          fill
          className="object-cover object-[center_15%]"
          priority
          sizes="100vw"
          quality={90}
        />
        {/* Dark overlay from bottom for text readability - sharp edge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 via-70% to-transparent" />

        {/* Hero Content - Positioned at very bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center text-white px-4 pb-4 md:pb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-2 drop-shadow-2xl">
            IAU 24h World Championships 2025
          </h1>
          <p className="text-base md:text-xl text-center mb-4 drop-shadow-lg">
            Albi, France • October 18-19, 2025
          </p>

          {/* Official Links */}
          <div className="flex flex-wrap justify-center gap-3 text-xs md:text-sm">
            <a
              href="https://iau-ultramarathon.org/2025-iau-24h-world-championships/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors underline"
            >
              Official IAU Page <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
            </a>
            <span className="text-white/50">•</span>
            <a
              href="https://www.albi24h.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors underline"
            >
              Organizer Website <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Latest News Section */}
        {!loadingNews && news.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Latest News</h2>
              </div>
              <Link href="/news">
                <Button variant="outline" size="sm">
                  View All News
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {news.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Individual Runners Card */}
          <Link href="/runners" className="group">
            <div className="h-full rounded-lg border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Individual Runners</h2>
                <p className="text-muted-foreground mb-6">
                  Browse all registered runners, view personal bests, DUV profiles, and performance history
                </p>
                <Button size="lg" className="w-full">
                  View Runners
                </Button>
              </div>
            </div>
          </Link>

          {/* Team Predictions Card */}
          <Link href="/teams" className="group">
            <div className="h-full rounded-lg border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Team Predictions</h2>
                <p className="text-muted-foreground mb-6">
                  Predicted team rankings based on top 3 runners per country using recent personal bests
                </p>
                <Button size="lg" className="w-full">
                  View Predictions
                </Button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

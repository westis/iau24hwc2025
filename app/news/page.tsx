'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SafeHtml } from '@/components/safe-html'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { NewsItem } from '@/types/news'

export default function NewsPage() {
  const { t, language } = useLanguage()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/api/news')
        if (!response.ok) {
          throw new Error('Failed to fetch news')
        }
        const data = await response.json()
        setNews(data.news)
      } catch (err) {
        console.error('Error loading news:', err)
        setError(err instanceof Error ? err.message : 'Failed to load news')
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.common.error}: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.news.title}</h1>
        <p className="text-muted-foreground mt-2">
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
          news.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <SafeHtml html={item.content} className="text-sm leading-relaxed" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}

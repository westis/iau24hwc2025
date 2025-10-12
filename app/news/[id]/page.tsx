'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SafeHtml } from '@/components/safe-html'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ArrowLeft } from 'lucide-react'
import type { NewsItem } from '@/types/news'

export default function NewsArticlePage() {
  const { t, language } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNewsItem() {
      try {
        const response = await fetch('/api/news')
        if (!response.ok) {
          throw new Error('Failed to fetch news')
        }
        const data = await response.json()
        const item = data.news.find((n: NewsItem) => n.id === Number(params.id))

        if (!item) {
          throw new Error('News item not found')
        }

        setNewsItem(item)
      } catch (err) {
        console.error('Error loading news:', err)
        setError(err instanceof Error ? err.message : 'Failed to load news')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchNewsItem()
    }
  }, [params.id])

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

  if (error || !newsItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.common.error}: {error || 'News not found'}</p>
          <Button onClick={() => router.push('/news')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.news.backToNews}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/news')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.news.backToNews}
        </Button>
      </div>

      {/* Article */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl">{newsItem.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(newsItem.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </CardHeader>
        <CardContent>
          <SafeHtml html={newsItem.content} className="text-base leading-relaxed" />
        </CardContent>
      </Card>
    </main>
  )
}

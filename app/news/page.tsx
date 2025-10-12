'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SafeHtml } from '@/components/safe-html'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { NewsItem } from '@/types/news'

interface Runner {
  id: number
  firstname: string
  lastname: string
  entryId: string
}

// Helper function to extract first paragraph from HTML
function getFirstParagraph(html: string): string {
  const parser = typeof window !== 'undefined' ? new DOMParser() : null
  if (!parser) return html

  const doc = parser.parseFromString(html, 'text/html')
  const firstP = doc.querySelector('p, h1, h2, h3')
  return firstP ? firstP.outerHTML : html
}

// Helper function to check if content has multiple paragraphs
function hasMultipleParagraphs(html: string): boolean {
  const parser = typeof window !== 'undefined' ? new DOMParser() : null
  if (!parser) return false

  const doc = parser.parseFromString(html, 'text/html')
  const elements = doc.querySelectorAll('p, h1, h2, h3, ul, ol')
  return elements.length > 1
}

export default function NewsPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [news, setNews] = useState<NewsItem[]>([])
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch news with runner links
        const newsResponse = await fetch('/api/news?includeRunnerLinks=true')
        if (!newsResponse.ok) {
          throw new Error('Failed to fetch news')
        }
        const newsData = await newsResponse.json()
        setNews(newsData.news)

        // Fetch runners
        const runnersResponse = await fetch('/api/runners')
        const runnersData = await runnersResponse.json()
        setRunners(runnersData.runners || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load news')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
          news.map((item) => {
            const isExpanded = expandedItems.has(item.id)
            const hasMore = hasMultipleParagraphs(item.content)
            const displayContent = !isExpanded && hasMore ? getFirstParagraph(item.content) : item.content
            const linkedRunners = item.linkedRunnerIds
              ? runners.filter(r => item.linkedRunnerIds?.includes(r.id))
              : []

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {linkedRunners.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {linkedRunners.map(runner => (
                          <Link
                            key={runner.id}
                            href={`/runners/${runner.entryId}`}
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
                  <SafeHtml html={displayContent} className="text-sm leading-relaxed" />

                  {hasMore && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newExpanded = new Set(expandedItems)
                          if (isExpanded) {
                            newExpanded.delete(item.id)
                          } else {
                            newExpanded.add(item.id)
                          }
                          setExpandedItems(newExpanded)
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            {t.news.showLess}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            {t.news.readMore}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/news/${item.id}`)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t.news.viewArticle}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </main>
  )
}

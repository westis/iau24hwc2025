'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/rich-text-editor'
import { SafeHtml } from '@/components/safe-html'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { NewsItem, NewsItemCreate } from '@/types/news'
import type { Runner } from '@/types/runner'

export default function AdminNewsPage() {
  const { t } = useLanguage()
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '', published: false, runnerIds: [] as number[], sendNotification: false })
  const [runners, setRunners] = useState<Runner[]>([])
  const [runnerSearch, setRunnerSearch] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    fetchNews()
  }, [isAdmin, router])

  // Fetch runners when creating or editing
  useEffect(() => {
    async function fetchRunners() {
      try {
        const response = await fetch('/api/runners')
        const data = await response.json()
        setRunners(data.runners || [])
      } catch (error) {
        console.error('Failed to fetch runners:', error)
      }
    }

    if (creating || editing) {
      fetchRunners()
    }
  }, [creating, editing])

  async function fetchNews() {
    try {
      const response = await fetch('/api/news?includeUnpublished=true&includeRunnerLinks=true')
      const data = await response.json()
      setNews(data.news)
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()

        // Send push notification if requested
        if (formData.sendNotification && formData.published) {
          await sendPushNotification(formData.title, formData.content, data.newsItem.id)
        }

        // Trigger cache revalidation
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: ['/', '/news'],
          }),
        })

        setCreating(false)
        setFormData({ title: '', content: '', published: false, runnerIds: [], sendNotification: false })
        setRunnerSearch('')
        await fetchNews()
      }
    } catch (error) {
      console.error('Failed to create news:', error)
    }
  }

  async function handleUpdate(id: number) {
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // Send push notification if requested
        if (formData.sendNotification && formData.published) {
          await sendPushNotification(formData.title, formData.content, id)
        }

        // Trigger cache revalidation
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: ['/', '/news'],
          }),
        })

        setEditing(null)
        setFormData({ title: '', content: '', published: false, runnerIds: [], sendNotification: false })
        setRunnerSearch('')
        await fetchNews()
      }
    } catch (error) {
      console.error('Failed to update news:', error)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t.news.confirmDelete)) return

    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Trigger cache revalidation
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: ['/', '/news'],
          }),
        })

        await fetchNews()
      }
    } catch (error) {
      console.error('Failed to delete news:', error)
    }
  }

  async function sendPushNotification(title: string, content: string, newsId: number) {
    try {
      // Strip HTML tags and truncate content for notification
      const plainText = content.replace(/<[^>]*>/g, '').substring(0, 150) + (content.length > 150 ? '...' : '')

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: plainText,
          url: `${window.location.origin}/news/${newsId}`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to send notification:', error)
        alert('Failed to send push notification: ' + error.error)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Error sending push notification')
    }
  }

  function startEdit(item: NewsItem) {
    setEditing(item)
    setFormData({
      title: item.title,
      content: item.content,
      published: item.published,
      runnerIds: item.linkedRunnerIds || [],
      sendNotification: false
    })
    setRunnerSearch('')
    setCreating(false)
  }

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormData({ title: '', content: '', published: false, runnerIds: [], sendNotification: false })
    setRunnerSearch('')
  }

  function cancelEdit() {
    setEditing(null)
    setCreating(false)
    setFormData({ title: '', content: '', published: false, runnerIds: [], sendNotification: false })
    setRunnerSearch('')
  }

  function toggleRunner(runnerId: number) {
    setFormData(prev => ({
      ...prev,
      runnerIds: prev.runnerIds.includes(runnerId)
        ? prev.runnerIds.filter(id => id !== runnerId)
        : [...prev.runnerIds, runnerId]
    }))
  }

  if (!isAdmin) return null
  if (loading) return <div className="p-8">{t.common.loading}</div>

  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.news.manageNews}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.news.manageSubtitle}
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating || editing !== null}>
          {t.news.createNews}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? t.news.editNews : t.news.createNews}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t.news.titleLabel}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder={t.news.titlePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t.news.contentLabel}</label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder={t.news.contentPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="published" className="text-sm font-medium cursor-pointer">
                  {t.news.published} ({t.news.publishedDesc})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={formData.sendNotification}
                  onChange={(e) => setFormData({ ...formData, sendNotification: e.target.checked })}
                  className="w-4 h-4"
                  disabled={!formData.published}
                />
                <label htmlFor="sendNotification" className="text-sm font-medium cursor-pointer">
                  Send push notification (only when published)
                </label>
              </div>
            </div>

            {/* Runner Linking */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">{t.news.linkRunners}</label>

              {/* Selected Runners */}
              {formData.runnerIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.runnerIds.map(runnerId => {
                    const runner = runners.find(r => r.id === runnerId)
                    if (!runner) return null
                    return (
                      <Badge key={runnerId} variant="secondary" className="gap-1">
                        {runner.firstname} {runner.lastname}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleRunner(runnerId)}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Search */}
              <Input
                type="text"
                value={runnerSearch}
                onChange={(e) => setRunnerSearch(e.target.value)}
                placeholder={t.news.searchRunners}
                className="mb-2"
              />

              {/* Runner List */}
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {runners
                  .filter(r =>
                    !runnerSearch ||
                    `${r.firstname} ${r.lastname}`.toLowerCase().includes(runnerSearch.toLowerCase()) ||
                    r.nationality.toLowerCase().includes(runnerSearch.toLowerCase())
                  )
                  .map(runner => (
                    <div
                      key={runner.id}
                      onClick={() => toggleRunner(runner.id)}
                      className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                        formData.runnerIds.includes(runner.id) ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {runner.firstname} {runner.lastname}
                        </span>
                        <span className="text-xs text-muted-foreground">{runner.nationality}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => editing ? handleUpdate(editing.id) : handleCreate()}
                disabled={!formData.title || !formData.content}
              >
                {editing ? t.common.update : t.common.create}
              </Button>
              <Button onClick={cancelEdit} variant="outline">
                {t.common.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* News List */}
      <div className="space-y-4">
        {news.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.news.noNewsYet}
            </CardContent>
          </Card>
        ) : (
          news.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {item.title}
                      {!item.published && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          {t.news.draft}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.news.created}: {new Date(item.created_at).toLocaleString()} |
                      {t.news.updated}: {new Date(item.updated_at).toLocaleString()}
                      {item.linkedRunnerIds && item.linkedRunnerIds.length > 0 && (
                        <> | {t.news.linkedRunners}: {item.linkedRunnerIds.length}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(item)}
                      disabled={creating || (editing !== null && editing.id !== item.id)}
                    >
                      {t.common.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      {t.common.delete}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SafeHtml html={item.content} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}

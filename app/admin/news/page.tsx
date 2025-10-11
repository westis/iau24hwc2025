'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { NewsItem, NewsItemCreate } from '@/types/news'

export default function AdminNewsPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '', published: false })

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    fetchNews()
  }, [isAdmin, router])

  async function fetchNews() {
    try {
      const response = await fetch('/api/news?includeUnpublished=true')
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
        setCreating(false)
        setFormData({ title: '', content: '', published: false })
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
        setEditing(null)
        setFormData({ title: '', content: '', published: false })
        await fetchNews()
      }
    } catch (error) {
      console.error('Failed to update news:', error)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this news item?')) return

    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchNews()
      }
    } catch (error) {
      console.error('Failed to delete news:', error)
    }
  }

  function startEdit(item: NewsItem) {
    setEditing(item)
    setFormData({ title: item.title, content: item.content, published: item.published })
    setCreating(false)
  }

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormData({ title: '', content: '', published: false })
  }

  function cancelEdit() {
    setEditing(null)
    setCreating(false)
    setFormData({ title: '', content: '', published: false })
  }

  if (!isAdmin) return null
  if (loading) return <div className="p-8">Loading...</div>

  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage News</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage news announcements
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating || editing !== null}>
          Create News
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? 'Edit News' : 'Create News'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Enter news title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[200px]"
                placeholder="Enter news content"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="published" className="text-sm font-medium cursor-pointer">
                Published (visible to public)
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => editing ? handleUpdate(editing.id) : handleCreate()}
                disabled={!formData.title || !formData.content}
              >
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button onClick={cancelEdit} variant="outline">
                Cancel
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
              No news items yet. Create one to get started.
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
                          Draft
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(item.created_at).toLocaleString()} |
                      Updated: {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(item)}
                      disabled={creating || (editing !== null && editing.id !== item.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{item.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Bell, Send } from 'lucide-react'

export default function AdminNotificationsPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!isAdmin) {
    router.push('/')
    return null
  }

  async function handleSend() {
    if (!title || !message) {
      alert('Please enter both title and message')
      return
    }

    setSending(true)
    setLastResult(null)

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          url: url || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setLastResult({
          success: true,
          message: `Notification sent successfully to ${data.recipients || 'all'} subscribers!`
        })
        // Clear form
        setTitle('')
        setMessage('')
        setUrl('')
      } else {
        setLastResult({
          success: false,
          message: data.error || 'Failed to send notification'
        })
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: 'Error sending notification'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Push Notifications</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Send push notifications to all subscribed users. Use this for race updates, breaking news, or important announcements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Race Starts in 1 Hour!"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Keep it short and attention-grabbing ({title.length}/50 characters)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Message <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., The men's race is about to begin. Watch live updates on the site!"
              rows={4}
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Clear and concise message ({message.length}/150 characters)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Link URL <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://iau24hwc2025.ultramarathon.se/news/123"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Clicking the notification will open this URL
            </p>
          </div>

          {lastResult && (
            <div className={`p-4 rounded-md ${lastResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
              {lastResult.message}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !title || !message}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Tips for Effective Notifications:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use sparingly to avoid notification fatigue</li>
              <li>Time-sensitive information works best (race starts, results posted)</li>
              <li>Include a clear call-to-action</li>
              <li>Test on your own device first before major announcements</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notification Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="font-medium">Race Start Alert</div>
            <div className="text-sm text-muted-foreground mt-1">
              Title: &quot;Women&apos;s Race Starting Now!&quot;<br />
              Message: &quot;Follow live progress and rankings on the site. Good luck to all runners!&quot;
            </div>
          </div>

          <div className="border-l-4 border-green-500 pl-4 py-2">
            <div className="font-medium">Breaking News</div>
            <div className="text-sm text-muted-foreground mt-1">
              Title: &quot;New World Record!&quot;<br />
              Message: &quot;Camille Herron breaks the 24h world record with 270.363 km!&quot;
            </div>
          </div>

          <div className="border-l-4 border-orange-500 pl-4 py-2">
            <div className="font-medium">Results Posted</div>
            <div className="text-sm text-muted-foreground mt-1">
              Title: &quot;Final Results Available&quot;<br />
              Message: &quot;View complete results and rankings for all teams and runners.&quot;
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

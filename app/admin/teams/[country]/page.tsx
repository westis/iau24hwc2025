'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'

interface TeamData {
  country_code: string
  team_photo_url: string | null
  description: string | null
}

export default function AdminTeamEditPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    team_photo_url: null as string | null,
    description: ''
  })

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      router.push('/')
      return
    }

    async function loadTeam() {
      try {
        const country = params.country as string
        const response = await fetch(`/api/teams/${country}`)

        if (!response.ok) {
          throw new Error('Failed to fetch team data')
        }

        const data = await response.json()
        setTeam(data)
        setFormData({
          team_photo_url: data.team_photo_url,
          description: data.description || ''
        })
      } catch (err) {
        console.error('Error loading team:', err)
        setError(err instanceof Error ? err.message : 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    if (params.country) {
      loadTeam()
    }
  }, [params.country, isAdmin, router])

  const handleSave = async () => {
    if (!team) return

    setSaving(true)
    try {
      const response = await fetch(`/api/teams/${team.country_code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update team')
      }

      // Redirect to team page after successful save
      router.push(`/teams/${team.country_code}`)
    } catch (err) {
      console.error('Error saving team:', err)
      alert(err instanceof Error ? err.message : 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error || 'Team not found'}</p>
          <Button onClick={() => router.push('/runners')}>Back to Runners</Button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push(`/teams/${team.country_code}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Team
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Edit Team {team.country_code}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage team photo and description
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Team Photo</Label>
              <ImageUpload
                bucket="team-photos"
                currentImageUrl={formData.team_photo_url}
                onUploadComplete={(url, path) => setFormData({ ...formData, team_photo_url: url })}
                onDelete={() => setFormData({ ...formData, team_photo_url: null })}
                label="Upload Team Photo"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upload a team photo (max 5MB). Recommended: Square aspect ratio.
              </p>
            </div>

            <div>
              <Label htmlFor="description">Team Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter team description or information"
                rows={8}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Add information about the team, their achievements, or any other relevant details.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push(`/teams/${team.country_code}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

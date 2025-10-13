'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Upload, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface RunnerQuickEdit {
  id: number
  entryId: string
  firstname: string
  lastname: string
  nationality: string
  photoUrl: string | null
  photoFocalX: number
  photoFocalY: number
  photoZoom: number
  instagramUrl: string | null
  stravaUrl: string | null
}

export default function QuickEditPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [runners, setRunners] = useState<RunnerQuickEdit[]>([])
  const [loading, setLoading] = useState(true)
  const [savingStates, setSavingStates] = useState<Record<number, boolean>>({})
  const [savedStates, setSavedStates] = useState<Record<number, boolean>>({})
  const [uploadingStates, setUploadingStates] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    async function loadRunners() {
      try {
        const response = await fetch('/api/runners')
        if (!response.ok) throw new Error('Failed to fetch runners')

        const data = await response.json()
        const runnersData: RunnerQuickEdit[] = data.runners.map((r: any) => ({
          id: r.id,
          entryId: r.entryId,
          firstname: r.firstname,
          lastname: r.lastname,
          nationality: r.nationality,
          photoUrl: r.photoUrl || null,
          photoFocalX: r.photoFocalX || 50,
          photoFocalY: r.photoFocalY || 50,
          photoZoom: r.photoZoom || 1.5,
          instagramUrl: r.instagramUrl || '',
          stravaUrl: r.stravaUrl || '',
        }))

        setRunners(runnersData)
      } catch (err) {
        console.error('Error loading runners:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRunners()
  }, [isAdmin, router])

  const updateRunner = (id: number, field: string, value: string) => {
    setRunners(runners.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ))
    // Clear saved state when editing
    setSavedStates(prev => ({ ...prev, [id]: false }))
  }

  const handleImageUpload = async (runnerId: number, file: File) => {
    setUploadingStates(prev => ({ ...prev, [runnerId]: true }))

    try {
      // Upload image
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'runner-photos')

      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error('Upload failed')

      const uploadData = await uploadResponse.json()

      // Update runner with new photo
      const runner = runners.find(r => r.id === runnerId)
      if (!runner) return

      const updateResponse = await fetch(`/api/runners/${runnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: uploadData.url,
          photo_focal_x: 50,
          photo_focal_y: 50,
          photo_zoom: 1.5,
        })
      })

      if (!updateResponse.ok) throw new Error('Failed to update runner')

      // Update local state
      setRunners(runners.map(r =>
        r.id === runnerId
          ? { ...r, photoUrl: uploadData.url, photoFocalX: 50, photoFocalY: 50, photoZoom: 1.5 }
          : r
      ))

      // Show saved state
      setSavedStates(prev => ({ ...prev, [runnerId]: true }))
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [runnerId]: false }))
      }, 2000)
    } catch (err) {
      console.error('Error uploading image:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingStates(prev => ({ ...prev, [runnerId]: false }))
    }
  }

  const saveRunner = async (runnerId: number) => {
    const runner = runners.find(r => r.id === runnerId)
    if (!runner) return

    setSavingStates(prev => ({ ...prev, [runnerId]: true }))

    try {
      const response = await fetch(`/api/runners/${runnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram_url: runner.instagramUrl || null,
          strava_url: runner.stravaUrl || null,
        })
      })

      if (!response.ok) throw new Error('Failed to save runner')

      // Show saved state
      setSavedStates(prev => ({ ...prev, [runnerId]: true }))
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [runnerId]: false }))
      }, 2000)
    } catch (err) {
      console.error('Error saving runner:', err)
      alert('Failed to save runner')
    } finally {
      setSavingStates(prev => ({ ...prev, [runnerId]: false }))
    }
  }

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading runners...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/runners')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Runners
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Quick Edit Runners</h1>
          <p className="text-muted-foreground mt-2">
            Quickly add photos and social media links for all runners
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Runners ({runners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {runners.map((runner) => (
                <div
                  key={runner.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Runner Info & Photo */}
                  <div className="flex items-center gap-4 md:w-1/4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border flex-shrink-0 bg-muted">
                      {runner.photoUrl ? (
                        <div
                          className="absolute inset-0"
                          style={{
                            transform: `scale(${runner.photoZoom})`,
                            transformOrigin: `${runner.photoFocalX}% ${runner.photoFocalY}%`
                          }}
                        >
                          <Image
                            src={runner.photoUrl}
                            alt={`${runner.firstname} ${runner.lastname}`}
                            fill
                            className="object-cover"
                            style={{
                              objectPosition: `${runner.photoFocalX}% ${runner.photoFocalY}%`
                            }}
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {runner.firstname} {runner.lastname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {runner.nationality}
                      </p>
                    </div>
                  </div>

                  {/* Upload Photo */}
                  <div className="md:w-1/4">
                    <label className="text-xs text-muted-foreground mb-1 block">Photo</label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`photo-${runner.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(runner.id, file)
                        }}
                        disabled={uploadingStates[runner.id]}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => document.getElementById(`photo-${runner.id}`)?.click()}
                        disabled={uploadingStates[runner.id]}
                      >
                        {uploadingStates[runner.id] ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </>
                        )}
                      </Button>
                      {runner.photoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/runners/${runner.entryId}`)}
                        >
                          Adjust
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
                    <Input
                      type="url"
                      placeholder="https://instagram.com/username"
                      value={runner.instagramUrl || ''}
                      onChange={(e) => updateRunner(runner.id, 'instagramUrl', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Strava */}
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Strava</label>
                    <Input
                      type="url"
                      placeholder="https://strava.com/athletes/123456"
                      value={runner.stravaUrl || ''}
                      onChange={(e) => updateRunner(runner.id, 'stravaUrl', e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={() => saveRunner(runner.id)}
                      disabled={savingStates[runner.id] || savedStates[runner.id]}
                      className="h-9"
                    >
                      {savingStates[runner.id] ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : savedStates[runner.id] ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

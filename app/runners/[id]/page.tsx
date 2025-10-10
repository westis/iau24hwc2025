'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Pencil } from 'lucide-react'

interface Performance {
  id: number
  event_name: string
  event_date: string
  distance: number
  rank: number | null
  event_type: string
}

interface RunnerProfile {
  id: number
  entry_id: string
  firstname: string
  lastname: string
  nationality: string
  gender: string
  duv_id: number | null
  personal_best_all_time: number | null
  personal_best_last_2_years: number | null
  date_of_birth: string | null
  age: number | null
  match_status: string
  performances: Performance[]
}

export default function RunnerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [runner, setRunner] = useState<RunnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllRaces, setShowAllRaces] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    nationality: '',
    gender: '' as 'M' | 'W' | ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isUnmatching, setIsUnmatching] = useState(false)

  useEffect(() => {
    async function loadRunner() {
      try {
        const response = await fetch(`/api/runners/${params.id}`)
        if (!response.ok) throw new Error('Failed to load runner')
        const data = await response.json()
        setRunner(data.runner)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runner')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadRunner()
    }
  }, [params.id])

  function openEditDialog() {
    if (runner) {
      setEditForm({
        firstname: runner.firstname,
        lastname: runner.lastname,
        nationality: runner.nationality,
        gender: runner.gender as 'M' | 'W'
      })
      setIsEditDialogOpen(true)
    }
  }

  function closeEditDialog() {
    setIsEditDialogOpen(false)
    setEditForm({ firstname: '', lastname: '', nationality: '', gender: '' })
  }

  async function saveEdit() {
    if (!runner) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/runners/${runner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('Failed to update runner')
      }

      // Reload the page to show updated data
      window.location.reload()
    } catch (err) {
      console.error('Error updating runner:', err)
      alert(err instanceof Error ? err.message : 'Failed to update runner')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUnmatch() {
    if (!runner || !runner.duv_id) return

    if (!confirm('Are you sure you want to unmatch this runner? This will remove the DUV ID and performance data.')) {
      return
    }

    setIsUnmatching(true)
    try {
      const response = await fetch(`/api/runners/${runner.id}/match`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to unmatch runner')
      }

      // Reload the page to show updated data
      window.location.reload()
    } catch (err) {
      console.error('Error unmatching runner:', err)
      alert(err instanceof Error ? err.message : 'Failed to unmatch runner')
    } finally {
      setIsUnmatching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading runner profile...</p>
        </div>
      </div>
    )
  }

  if (error || !runner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error || 'Runner not found'}</p>
          <Button onClick={() => router.push('/runners')}>Back to Runners</Button>
        </div>
      </div>
    )
  }

  const performances24h = runner.performances.filter(p => p.event_type === '24h')
  const displayedPerformances = showAllRaces ? runner.performances : performances24h

  // Helper to determine if event is time-based (where result is distance) or distance-based (where result is time/laps)
  const isTimeBased = (eventType: string) => {
    const timeBasedEvents = ['24h', '6h', '12h', '48h', '6d', '10d']
    return timeBasedEvents.some(type => eventType.toLowerCase().includes(type))
  }

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/runners')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Runners
        </Button>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {runner.firstname} {runner.lastname}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={openEditDialog}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{runner.nationality}</Badge>
            <Badge variant="outline">{runner.gender === 'M' ? 'Men' : 'Women'}</Badge>
            {runner.age && <Badge variant="outline">Age {runner.age}</Badge>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Bests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">All-Time PB</p>
                  <p className="text-2xl font-bold text-primary">
                    {runner.personal_best_all_time ? `${runner.personal_best_all_time.toFixed(2)} km` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last 3 Years PB (since Oct 2022)</p>
                  <p className="text-2xl font-bold text-primary">
                    {runner.personal_best_last_2_years ? `${runner.personal_best_last_2_years.toFixed(2)} km` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Runner Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Entry ID</p>
                  <p className="font-medium">{runner.entry_id}</p>
                </div>
                {runner.date_of_birth && (
                  <div>
                    <p className="text-sm text-muted-foreground">Year of Birth</p>
                    <p className="font-medium">{new Date(runner.date_of_birth).getFullYear()}</p>
                  </div>
                )}
                {runner.duv_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">DUV Profile</p>
                    <a
                      href={`https://statistik.d-u-v.org/getresultperson.php?runner=${runner.duv_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View on DUV →
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {showAllRaces ? 'All Race History' : '24h Race History'} ({displayedPerformances.length} races)
              </CardTitle>
              <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
                <Button
                  variant={!showAllRaces ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowAllRaces(false)}
                  className={!showAllRaces ? '' : 'hover:bg-accent'}
                >
                  24h Only
                </Button>
                <Button
                  variant={showAllRaces ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowAllRaces(true)}
                  className={showAllRaces ? '' : 'hover:bg-accent'}
                >
                  All Races
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedPerformances.length === 0 ? (
              <p className="text-muted-foreground">No race history available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Date</th>
                      <th className="text-left py-2 px-4">Event</th>
                      {showAllRaces && <th className="text-left py-2 px-4">Type</th>}
                      <th className="text-right py-2 px-4">Result</th>
                      <th className="text-right py-2 px-4">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPerformances.map((perf) => {
                      const timeBased = isTimeBased(perf.event_type)
                      return (
                        <tr key={perf.id} className="border-b hover:bg-accent">
                          <td className="py-2 px-4 text-sm">
                            {perf.event_date ? new Date(perf.event_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-2 px-4 text-sm">{perf.event_name}</td>
                          {showAllRaces && (
                            <td className="py-2 px-4 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {perf.event_type || 'Unknown'}
                              </Badge>
                            </td>
                          )}
                          <td className="py-2 px-4 text-sm text-right font-medium">
                            {timeBased ? (
                              // For time-based events, distance is the result in km
                              `${perf.distance.toFixed(2)} km`
                            ) : (
                              // For distance-based events, show the raw value (could be time, laps, etc.)
                              perf.distance.toFixed(2)
                            )}
                          </td>
                          <td className="py-2 px-4 text-sm text-right">
                            {perf.rank || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Runner</DialogTitle>
              <DialogDescription>
                Make changes to runner information. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstname" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstname"
                  value={editForm.firstname}
                  onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastname" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastname"
                  value={editForm.lastname}
                  onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nationality" className="text-right">
                  Nationality
                </Label>
                <Input
                  id="nationality"
                  value={editForm.nationality}
                  onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  maxLength={3}
                  placeholder="3-letter code (e.g., USA, GER, CRO)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gender" className="text-right">
                  Gender
                </Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value: 'M' | 'W') => setEditForm({ ...editForm, gender: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="W">W</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                {runner?.duv_id && (
                  <Button
                    variant="destructive"
                    onClick={handleUnmatch}
                    disabled={isSaving || isUnmatching}
                  >
                    {isUnmatching ? 'Unmatching...' : 'Unmatch'}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeEditDialog} disabled={isSaving || isUnmatching}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={isSaving || isUnmatching}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

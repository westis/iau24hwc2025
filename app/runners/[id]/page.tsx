'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Pencil } from 'lucide-react'

interface Performance {
  id: number
  event_name: string
  event_date: string
  distance: number
  rank: number | null
  event_type: string
}

interface DUVPersonalBest {
  PB: string
  [year: string]: string | {
    Perf: string
    RankIntNat?: string
  }
}

interface RunnerProfile {
  id: number
  entry_id: string
  firstname: string
  lastname: string
  nationality: string
  gender: string
  dns?: boolean
  duv_id: number | null
  personal_best_all_time: number | null
  personal_best_all_time_year?: number
  personal_best_last_3_years: number | null
  personal_best_last_3_years_year?: number
  date_of_birth: string | null
  age: number | null
  match_status: string
  performances: Performance[]
  allPBs?: Array<{
    [distance: string]: DUVPersonalBest
  }>
}

export default function RunnerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [runner, setRunner] = useState<RunnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllRaces, setShowAllRaces] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    nationality: '',
    gender: '' as 'M' | 'W' | '',
    dns: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isUnmatching, setIsUnmatching] = useState(false)

  useEffect(() => {
    function loadRunner() {
      try {
        // Load from localStorage
        const stored = localStorage.getItem('runners')
        if (!stored) {
          setError('No runners found in storage')
          setLoading(false)
          return
        }

        const runners = JSON.parse(stored)
        // Find runner by ID (the ID in the URL is actually entry_id)
        const foundRunner = runners.find((r: any) => r.entryId === params.id || r.id === Number(params.id))

        if (!foundRunner) {
          setError('Runner not found')
          setLoading(false)
          return
        }

        // Transform to match the expected structure
        const runnerProfile: RunnerProfile = {
          id: foundRunner.id,
          entry_id: foundRunner.entryId,
          firstname: foundRunner.firstname,
          lastname: foundRunner.lastname,
          nationality: foundRunner.nationality,
          gender: foundRunner.gender,
          dns: foundRunner.dns || false,
          duv_id: foundRunner.duvId,
          personal_best_all_time: foundRunner.personalBestAllTime,
          personal_best_all_time_year: foundRunner.personalBestAllTimeYear,
          personal_best_last_3_years: foundRunner.personalBestLast3Years,
          personal_best_last_3_years_year: foundRunner.personalBestLast3YearsYear,
          date_of_birth: foundRunner.dateOfBirth,
          age: foundRunner.age,
          match_status: foundRunner.matchStatus,
          allPBs: foundRunner.allPBs || [],
          performances: (foundRunner.performanceHistory || []).map((p: any) => ({
            id: p.eventId,
            event_name: p.eventName,
            event_date: p.date,
            distance: p.distance,
            rank: p.rank,
            event_type: p.eventType,
          }))
        }

        console.log('Runner loaded:', {
          name: `${foundRunner.firstname} ${foundRunner.lastname}`,
          hasPerformanceHistory: !!foundRunner.performanceHistory,
          performanceCount: foundRunner.performanceHistory?.length || 0,
          samplePerformance: foundRunner.performanceHistory?.[0]
        })

        setRunner(runnerProfile)
      } catch (err) {
        console.error('Error loading runner:', err)
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
        gender: runner.gender as 'M' | 'W',
        dns: runner.dns || false
      })
      setIsEditDialogOpen(true)
    }
  }

  function closeEditDialog() {
    setIsEditDialogOpen(false)
    setEditForm({ firstname: '', lastname: '', nationality: '', gender: '', dns: false })
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

      const data = await response.json()

      // Update localStorage with new data
      const stored = localStorage.getItem('runners')
      if (stored) {
        const runners = JSON.parse(stored)
        const index = runners.findIndex((r: any) => r.id === runner.id)
        if (index !== -1) {
          // Update the runner in localStorage
          runners[index] = {
            ...runners[index],
            firstname: data.runner.firstname,
            lastname: data.runner.lastname,
            nationality: data.runner.nationality,
            gender: data.runner.gender,
            dns: data.runner.dns || false
          }
          localStorage.setItem('runners', JSON.stringify(runners))
        }
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

  // Filter out splits and deduplicate by date
  const filterPerformances = (perfs: Performance[]) => {
    // First, filter out events with "split" or "Split" in the name
    const nonSplits = perfs.filter(p => !p.event_name.toLowerCase().includes('split'))

    // Group by date and keep only one per date (prefer non-combined events)
    const byDate = new Map<string, Performance>()
    for (const perf of nonSplits) {
      const existing = byDate.get(perf.event_date)
      if (!existing) {
        byDate.set(perf.event_date, perf)
      } else {
        // Prefer events without "combined" or "all races" in the name
        const isCombined = perf.event_name.toLowerCase().includes('combined') ||
                          perf.event_name.toLowerCase().includes('all races')
        const existingIsCombined = existing.event_name.toLowerCase().includes('combined') ||
                                   existing.event_name.toLowerCase().includes('all races')

        if (existingIsCombined && !isCombined) {
          byDate.set(perf.event_date, perf)
        }
      }
    }

    return Array.from(byDate.values())
  }

  const filteredPerformances = filterPerformances(runner.performances)
  const performances24h = filteredPerformances.filter(p => p.event_type === '24h')
  const displayedPerformances = showAllRaces ? filteredPerformances : performances24h

  // Helper to determine if event is time-based (where result is distance) or distance-based (where result is time/laps)
  const isTimeBased = (eventType: string) => {
    const timeBasedEvents = ['24h', '6h', '12h', '48h', '6d', '10d']
    return timeBasedEvents.some(type => eventType.toLowerCase().includes(type))
  }

  // Format seconds as h:mm:ss
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Decode HTML entities in event names
  const decodeHTML = (html: string): string => {
    const txt = document.createElement('textarea')
    txt.innerHTML = html
    return txt.value
  }

  // Extract PBs from allPBs data (from DUV)
  const getPBFromAllPBs = (distanceKey: string): { distance: number; year: number } | null => {
    if (!runner.allPBs || runner.allPBs.length === 0) return null

    const pbData = runner.allPBs.find(pb => pb[distanceKey])
    if (!pbData || !pbData[distanceKey]) return null

    const distancePB = pbData[distanceKey]
    const pbValue = parseFloat(distancePB.PB)
    if (isNaN(pbValue)) return null

    // Find the year when PB was set
    const yearKeys = Object.keys(distancePB).filter(k => k !== 'PB' && !isNaN(parseInt(k)))
    let pbYear: number | undefined

    for (const year of yearKeys) {
      const yearData = distancePB[year]
      if (typeof yearData === 'object' && yearData.Perf) {
        const perfValue = parseFloat(yearData.Perf)
        if (!isNaN(perfValue) && Math.abs(perfValue - pbValue) < 0.01) {
          pbYear = parseInt(year)
          break
        }
      }
    }

    return {
      distance: pbValue,
      year: pbYear || parseInt(yearKeys[yearKeys.length - 1]) || new Date().getFullYear()
    }
  }

  const pb6h = getPBFromAllPBs('6h')
  const pb12h = getPBFromAllPBs('12h')
  const pb48h = getPBFromAllPBs('48h')
  const hasOtherPBs = pb6h || pb12h || pb48h

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
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEditDialog}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{runner.nationality}</Badge>
            <Badge variant="outline">{runner.gender === 'M' ? 'Men' : 'Women'}</Badge>
            {(runner.age || runner.date_of_birth) && (
              <Badge variant="outline">
                {runner.age && `Age ${runner.age}`}
                {runner.age && runner.date_of_birth && ' • '}
                {runner.date_of_birth && `YOB ${new Date(runner.date_of_birth).getFullYear()}`}
              </Badge>
            )}
            {runner.duv_id && (
              <a
                href={`https://statistik.d-u-v.org/getresultperson.php?runner=${runner.duv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors ml-2"
              >
                DUV Profile →
              </a>
            )}
          </div>
        </div>

        <div className={`grid gap-6 ${hasOtherPBs ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl'} mb-6`}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Bests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">All-Time PB</p>
                  <p className="text-2xl font-bold text-primary">
                    {runner.personal_best_all_time ? (
                      <>
                        {runner.personal_best_all_time.toFixed(3)} km
                        {runner.personal_best_all_time_year && (
                          <span className="text-base text-muted-foreground ml-2">({runner.personal_best_all_time_year})</span>
                        )}
                      </>
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PB 2023-2025</p>
                  <p className="text-2xl font-bold text-primary">
                    {runner.personal_best_last_3_years ? (
                      <>
                        {runner.personal_best_last_3_years.toFixed(3)} km
                        {runner.personal_best_last_3_years_year && (
                          <span className="text-base text-muted-foreground ml-2">({runner.personal_best_last_3_years_year})</span>
                        )}
                      </>
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasOtherPBs && (
            <Card>
              <CardHeader>
                <CardTitle>Other PBs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pb6h && (
                    <div>
                      <p className="text-sm text-muted-foreground">6h PB</p>
                      <p className="text-2xl font-bold text-primary">
                        {pb6h.distance.toFixed(3)} km
                        <span className="text-base text-muted-foreground ml-2">({pb6h.year})</span>
                      </p>
                    </div>
                  )}
                  {pb12h && (
                    <div>
                      <p className="text-sm text-muted-foreground">12h PB</p>
                      <p className="text-2xl font-bold text-primary">
                        {pb12h.distance.toFixed(3)} km
                        <span className="text-base text-muted-foreground ml-2">({pb12h.year})</span>
                      </p>
                    </div>
                  )}
                  {pb48h && (
                    <div>
                      <p className="text-sm text-muted-foreground">48h PB</p>
                      <p className="text-2xl font-bold text-primary">
                        {pb48h.distance.toFixed(3)} km
                        <span className="text-base text-muted-foreground ml-2">({pb48h.year})</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
                          <td className="py-2 px-4 text-sm">{decodeHTML(perf.event_name)}</td>
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
                              `${perf.distance.toFixed(3)} km`
                            ) : (
                              // For distance-based events, format as time (h:mm:ss)
                              formatTime(perf.distance)
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dns" className="text-right">
                  DNS
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="dns"
                    checked={editForm.dns}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, dns: checked as boolean })}
                  />
                  <label
                    htmlFor="dns"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Did Not Start (hidden by default)
                  </label>
                </div>
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

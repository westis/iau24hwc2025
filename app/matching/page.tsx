'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import type { Runner, MatchStatus } from '@/types/runner'
import type { DUVSearchResult } from '@/types/match'
import { RunnerTable } from '@/components/tables/runner-table'
import { ManualMatchDialog } from '@/components/dialogs/manual-match-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, Search, Database, AlertCircle, Lock } from 'lucide-react'

export default function MatchingPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [runners, setRunners] = React.useState<Runner[]>([])
  const [isAutoMatching, setIsAutoMatching] = React.useState(false)
  const [isFetchingPerformances, setIsFetchingPerformances] = React.useState(false)
  const [matchProgress, setMatchProgress] = React.useState<{ current: number; total: number } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Manual match dialog state
  const [isManualDialogOpen, setIsManualDialogOpen] = React.useState(false)
  const [currentRunner, setCurrentRunner] = React.useState<Runner | null>(null)
  const [candidates, setCandidates] = React.useState<DUVSearchResult[]>([])
  const [isLoadingCandidates, setIsLoadingCandidates] = React.useState(false)

  // Protect route - redirect if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      router.push('/admin')
    }
  }, [isAdmin, router])

  // Load runners from localStorage on mount
  React.useEffect(() => {
    if (!isAdmin) return // Don't load if not admin

    const stored = localStorage.getItem('runners')
    if (stored) {
      try {
        const parsedRunners = JSON.parse(stored) as Runner[]
        setRunners(parsedRunners)
      } catch (error) {
        console.error('Error loading runners from localStorage:', error)
        setError('Failed to load runners from storage')
      }
    } else {
      // No runners found, redirect to upload
      router.push('/upload')
    }
  }, [isAdmin, router])

  const saveRunners = (updatedRunners: Runner[]) => {
    setRunners(updatedRunners)
    localStorage.setItem('runners', JSON.stringify(updatedRunners))
  }

  const handleAutoMatchAll = async () => {
    if (runners.length === 0) {
      setError('No runners to match')
      return
    }

    setIsAutoMatching(true)
    setError(null)
    setMatchProgress({ current: 0, total: runners.length })

    const updatedRunners: Runner[] = []

    try {
      for (let i = 0; i < runners.length; i++) {
        const runner = runners[i]
        setMatchProgress({ current: i + 1, total: runners.length })

        // Skip already matched runners
        if (runner.matchStatus !== 'unmatched') {
          updatedRunners.push(runner)
          continue
        }

        try {
          // Call match API
          const response = await fetch('/api/match-runner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runner }),
          })

          if (!response.ok) {
            console.error(`Failed to match runner ${runner.entryId}`)
            updatedRunners.push(runner)
            continue
          }

          const data = await response.json()

          // Update runner with match result
          const updatedRunner: Runner = {
            ...runner,
            duvId: data.selectedDuvId || null,
            matchStatus: data.selectedDuvId ? 'auto-matched' : 'unmatched',
            matchConfidence: data.candidates[0]?.confidence,
          }

          updatedRunners.push(updatedRunner)

        } catch (error) {
          console.error(`Error matching runner ${runner.entryId}:`, error)
          updatedRunners.push(runner)
        }
      }

      // Save updated runners
      saveRunners(updatedRunners)

    } catch (error) {
      console.error('Auto-match error:', error)
      setError(error instanceof Error ? error.message : 'Failed to auto-match runners')
    } finally {
      setIsAutoMatching(false)
      setMatchProgress(null)
    }
  }

  const handleManualMatch = async (runner: Runner) => {
    setCurrentRunner(runner)
    setIsLoadingCandidates(true)
    setIsManualDialogOpen(true)
    setCandidates([])

    try {
      // Fetch candidates from API
      const response = await fetch('/api/match-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch candidates')
      }

      const data = await response.json()
      setCandidates(data.candidates || [])

    } catch (error) {
      console.error('Error fetching candidates:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch candidates')
      setCandidates([])
    } finally {
      setIsLoadingCandidates(false)
    }
  }

  const handleConfirmManualMatch = async (runner: Runner, selectedDuvId: number | null) => {
    // Update runner with manual match
    const updatedRunners = runners.map(r => {
      if (r.entryId === runner.entryId) {
        return {
          ...r,
          duvId: selectedDuvId,
          matchStatus: (selectedDuvId === null ? 'no-match' : 'manually-matched') as MatchStatus,
        }
      }
      return r
    })

    saveRunners(updatedRunners)
  }

  const handleFetchPerformances = async () => {
    const matchedRunners = runners.filter(r => r.duvId !== null)

    if (matchedRunners.length === 0) {
      setError('No matched runners found. Please match runners first.')
      return
    }

    setIsFetchingPerformances(true)
    setError(null)

    try {
      const response = await fetch('/api/fetch-performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runners }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch performances')
      }

      const data = await response.json()
      const enrichedRunners = data.runners as Runner[]

      // Save enriched runners
      saveRunners(enrichedRunners)

      // Navigate to rankings
      router.push('/rankings')

    } catch (error) {
      console.error('Fetch performances error:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch performance data')
    } finally {
      setIsFetchingPerformances(false)
    }
  }

  const handleRowClick = (runnerId: number) => {
    router.push(`/runners/${runnerId}`)
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = runners.length
    const autoMatched = runners.filter(r => r.matchStatus === 'auto-matched').length
    const manuallyMatched = runners.filter(r => r.matchStatus === 'manually-matched').length
    const noMatch = runners.filter(r => r.matchStatus === 'no-match').length
    const unmatched = runners.filter(r => r.matchStatus === 'unmatched').length
    const allMatched = unmatched === 0

    return {
      total,
      autoMatched,
      manuallyMatched,
      noMatch,
      unmatched,
      allMatched,
    }
  }, [runners])

  // Show loading/unauthorized state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Runner Matching</h1>
          <p className="text-xl text-slate-600">Match runners to DUV database profiles</p>
        </div>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Progress</CardTitle>
            <CardDescription>
              Track the matching status of all runners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-sm text-slate-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.autoMatched}</div>
                <div className="text-sm text-slate-600">Auto-Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.manuallyMatched}</div>
                <div className="text-sm text-slate-600">Manual</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.noMatch}</div>
                <div className="text-sm text-slate-600">No Match</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.unmatched}</div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>
            </div>

            {stats.allMatched && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center text-sm font-medium">
                All runners have been matched! Ready to fetch performance data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Auto-match runners or fetch performance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Progress Indicator */}
            {matchProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Matching {matchProgress.current} of {matchProgress.total}...
                  </span>
                  <span className="font-medium">
                    {Math.round((matchProgress.current / matchProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(matchProgress.current / matchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAutoMatchAll}
                disabled={isAutoMatching || runners.length === 0}
                className="flex-1"
                size="lg"
              >
                {isAutoMatching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auto-Matching...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Auto-Match All
                  </>
                )}
              </Button>

              <Button
                onClick={handleFetchPerformances}
                disabled={!stats.allMatched || isFetchingPerformances}
                variant="default"
                className="flex-1"
                size="lg"
              >
                {isFetchingPerformances ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Fetch Performance Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Runners Table */}
        {runners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Runners ({runners.length})</CardTitle>
              <CardDescription>
                Review and manually match unmatched runners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RunnerTable
                runners={runners}
                onManualMatch={handleManualMatch}
                onRowClick={handleRowClick}
              />
            </CardContent>
          </Card>
        )}

        {/* Manual Match Dialog */}
        <ManualMatchDialog
          open={isManualDialogOpen}
          onOpenChange={setIsManualDialogOpen}
          runner={currentRunner}
          candidates={candidates}
          onConfirm={handleConfirmManualMatch}
          loading={isLoadingCandidates}
        />
      </div>
    </div>
  )
}

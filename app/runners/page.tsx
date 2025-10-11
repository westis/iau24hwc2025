'use client'

import * as React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RunnerTable } from '@/components/tables/runner-table'
import { Button } from '@/components/ui/button'
import type { Runner } from '@/types/runner'

export default function RunnersPage() {
  const router = useRouter()
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<'M' | 'W'>('M')
  const [selectedMetric, setSelectedMetric] = useState<'last-3-years' | 'all-time'>('last-3-years')
  const [isPending, startTransition] = React.useTransition()

  useEffect(() => {
    // Fetch runners from API (Supabase)
    async function fetchRunners() {
      try {
        setLoading(true)

        const response = await fetch('/api/runners')
        if (!response.ok) {
          throw new Error('Failed to fetch runners from API')
        }

        const data = await response.json()
        const fetchedRunners = data.runners as Runner[]

        console.log('Fetched runners from API:', fetchedRunners.length)

        // Debug: Count runners by status
        const byStatus = fetchedRunners.reduce((acc: any, r: Runner) => {
          acc[r.matchStatus] = (acc[r.matchStatus] || 0) + 1
          return acc
        }, {})
        console.log('Runners by match status:', byStatus)

        // Debug: Count runners with/without DUV ID
        const withDuv = fetchedRunners.filter((r: Runner) => r.duvId !== null).length
        const withoutDuv = fetchedRunners.filter((r: Runner) => r.duvId === null).length
        console.log(`With DUV ID: ${withDuv}, Without DUV ID: ${withoutDuv}`)

        // Store in localStorage as cache
        localStorage.setItem('runners', JSON.stringify(fetchedRunners))

        setRunners(fetchedRunners)
      } catch (err) {
        console.error('Error loading runners from API:', err)
        setError(err instanceof Error ? err.message : 'Failed to load runners')
      } finally {
        setLoading(false)
      }
    }

    fetchRunners()
  }, [])

  // Filter, sort, and add rankings
  const runnersWithRankings = useMemo(() => {
    // Get PB value based on selected metric
    const getPB = (runner: Runner) => {
      return selectedMetric === 'last-3-years'
        ? runner.personalBestLast3Years || 0
        : runner.personalBestAllTime || 0
    }

    // Filter by gender
    let filtered = runners.filter(runner => runner.gender === selectedGender)

    // Separate matched (with DUV ID) and unmatched runners
    const matched = filtered.filter(r => r.duvId !== null)
    const unmatched = filtered.filter(r => r.duvId === null)

    // Sort matched runners by PB (highest first) - includes both DNS and non-DNS
    const sortedMatched = matched.sort((a, b) => {
      const aPB = getPB(a)
      const bPB = getPB(b)
      return bPB - aPB // Descending order (highest PB first)
    })

    // Sort unmatched runners by name
    const sortedUnmatched = unmatched.sort((a, b) => {
      const aName = `${a.lastname} ${a.firstname}`.toLowerCase()
      const bName = `${b.lastname} ${b.firstname}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    // Assign rankings only to non-DNS runners with DUV ID
    let currentRank = 1
    const rankedMatched = sortedMatched.map((runner) => {
      if (runner.dns) {
        // DNS runner - no rank
        return { ...runner, rank: undefined }
      } else {
        // Active runner - assign rank
        return { ...runner, rank: currentRank++ }
      }
    })

    // Combine: ranked matched first (with DNS in natural position), then unmatched
    return [...rankedMatched, ...sortedUnmatched]
  }, [runners, selectedGender, selectedMetric])

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <p className="text-muted-foreground">Run backend CLI tools to populate data</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Individual Runners</h1>
          <p className="mt-2 text-muted-foreground">
            IAU 24h World Championships 2025 - Albi, France
          </p>
        </div>

        {/* Gender Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
            <Button
              variant={selectedGender === 'M' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => startTransition(() => setSelectedGender('M'))}
              className={selectedGender === 'M' ? '' : 'hover:bg-accent'}
              disabled={isPending}
            >
              Men
            </Button>
            <Button
              variant={selectedGender === 'W' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => startTransition(() => setSelectedGender('W'))}
              className={selectedGender === 'W' ? '' : 'hover:bg-accent'}
              disabled={isPending}
            >
              Women
            </Button>
          </div>
          <div className="inline-flex rounded-lg border border-input bg-background p-1 ml-auto" role="group">
            <Button
              variant={selectedMetric === 'last-3-years' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => startTransition(() => setSelectedMetric('last-3-years'))}
              className={selectedMetric === 'last-3-years' ? '' : 'hover:bg-accent'}
              disabled={isPending}
            >
              2023-2025
            </Button>
            <Button
              variant={selectedMetric === 'all-time' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => startTransition(() => setSelectedMetric('all-time'))}
              className={selectedMetric === 'all-time' ? '' : 'hover:bg-accent'}
              disabled={isPending}
            >
              All Time
            </Button>
          </div>
        </div>

        <RunnerTable
          runners={runnersWithRankings}
          metric={selectedMetric}
          onManualMatch={(runner) => {
            router.push('/match')
          }}
          onRowClick={(runnerId) => {
            router.push(`/runners/${runnerId}`)
          }}
        />
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TeamCard } from '@/components/cards/team-card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Team } from '@/types/team'
import type { Runner, Gender } from '@/types/runner'

function TeamsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [runners, setRunners] = useState<Runner[]>([])
  const [metric, setMetric] = useState<'all-time' | 'last-3-years'>(() => {
    const m = searchParams.get('metric')
    return (m === 'all-time' ? 'all-time' : 'last-3-years') as 'all-time' | 'last-3-years'
  })
  const [gender, setGender] = useState<Gender>(() => {
    const g = searchParams.get('gender')
    return (g === 'W' ? 'W' : 'M') as Gender
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update URL when filters change
  const updateURL = (params: { gender?: Gender; metric?: 'all-time' | 'last-3-years' }) => {
    const newParams = new URLSearchParams(searchParams.toString())

    if (params.gender) newParams.set('gender', params.gender)
    if (params.metric) newParams.set('metric', params.metric)

    router.push(`/teams?${newParams.toString()}`, { scroll: false })
  }

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

        // NOTE: localStorage caching removed - data too large and exceeds quota

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

  // Calculate teams client-side
  const teams = useMemo(() => {
    // Filter runners for this gender (include DNS runners)
    const genderRunners = runners.filter(r => r.gender === gender)

    // Group ALL runners by nationality (including DNS)
    const teamGroups = new Map<string, Runner[]>()
    genderRunners.forEach(runner => {
      const key = runner.nationality
      if (!teamGroups.has(key)) {
        teamGroups.set(key, [])
      }
      teamGroups.get(key)!.push(runner)
    })

    // Calculate team totals
    const allTeams: Team[] = Array.from(teamGroups.entries()).map(([nationality, allTeamRunners]) => {
      // Separate runners with PBs from those without, and DNS runners
      const runnersWithPB = allTeamRunners.filter(r => {
        const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast3Years
        return pb !== null && pb > 0
      })

      // Sort runners with PBs by PB (descending) - includes DNS in natural position
      const sortedWithPB = runnersWithPB.sort((a, b) => {
        const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast3Years
        const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast3Years
        return (bVal || 0) - (aVal || 0)
      })

      // Sort runners without PBs alphabetically
      const runnersWithoutPB = allTeamRunners.filter(r => {
        const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast3Years
        return pb === null || pb === 0
      }).sort((a, b) => {
        const aName = `${a.lastname} ${a.firstname}`
        const bName = `${b.lastname} ${b.firstname}`
        return aName.localeCompare(bName)
      })

      // Combine: runners with PBs first (DNS in natural PB position), then runners without PBs
      const allSorted = [...sortedWithPB, ...runnersWithoutPB]

      // Take top 3 NON-DNS runners with PBs for team ranking
      const topThreeNonDNS = sortedWithPB.filter(r => !r.dns).slice(0, 3)

      // Calculate team total (only from top 3 non-DNS runners with PBs)
      const teamTotal = topThreeNonDNS.reduce((sum, r) => {
        const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast3Years
        return sum + (pb || 0)
      }, 0)

      return {
        nationality,
        gender,
        runners: allSorted, // All runners for this nationality (including DNS)
        topThree: topThreeNonDNS,
        teamTotal,
      }
    })

    // Filter out teams with no valid PBs (can't rank them), then sort by team total
    return allTeams
      .filter(team => team.teamTotal > 0)
      .sort((a, b) => b.teamTotal - a.teamTotal)
  }, [runners, metric, gender])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.teams.loadingPredictions}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.common.error}: {error}</p>
          <p className="text-muted-foreground">{t.teams.runBackendTools}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t.teams.title}</h1>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Gender Toggle */}
        <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
          <Button
            variant={gender === 'M' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setGender('M')
              updateURL({ gender: 'M', metric })
            }}
            className={gender === 'M' ? '' : 'hover:bg-accent'}
          >
            {t.teams.men}
          </Button>
          <Button
            variant={gender === 'W' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setGender('W')
              updateURL({ gender: 'W', metric })
            }}
            className={gender === 'W' ? '' : 'hover:bg-accent'}
          >
            {t.teams.women}
          </Button>
        </div>

        {/* Metric Toggle */}
        <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
          <Button
            variant={metric === 'last-3-years' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setMetric('last-3-years')
              updateURL({ gender, metric: 'last-3-years' })
            }}
            className={metric === 'last-3-years' ? '' : 'hover:bg-accent'}
          >
            {t.teams.last3Years}
          </Button>
          <Button
            variant={metric === 'all-time' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setMetric('all-time')
              updateURL({ gender, metric: 'all-time' })
            }}
            className={metric === 'all-time' ? '' : 'hover:bg-accent'}
          >
            {t.teams.allTime}
          </Button>
        </div>
      </div>

      {/* Teams */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          {gender === 'M' ? t.teams.men : t.teams.women} ({teams.length})
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.teams.noTeamData}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, index) => (
              <TeamCard
                key={team.nationality}
                rank={index + 1}
                team={team}
                gender={gender}
                metric={metric}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function TeamsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsPageFallback />}>
      <TeamsPageContent />
    </Suspense>
  )
}

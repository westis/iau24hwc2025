'use client'

import { useEffect, useState, useMemo } from 'react'
import { TeamCard } from '@/components/cards/team-card'
import { Button } from '@/components/ui/button'
import type { Team } from '@/types/team'
import type { Runner, Gender } from '@/types/runner'

export default function TeamsPage() {
  const [runners, setRunners] = useState<Runner[]>([])
  const [metric, setMetric] = useState<'all-time' | 'last-2-years'>('last-2-years')
  const [gender, setGender] = useState<Gender>('M')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load runners from localStorage
    try {
      setLoading(true)
      const stored = localStorage.getItem('runners')
      if (stored) {
        const parsedRunners = JSON.parse(stored) as Runner[]
        setRunners(parsedRunners)
      } else {
        setError('No runners found. Please upload an entry list.')
      }
    } catch (err) {
      console.error('Error loading runners from localStorage:', err)
      setError(err instanceof Error ? err.message : 'Failed to load runners')
    } finally {
      setLoading(false)
    }
  }, [])

  // Calculate teams client-side
  const teams = useMemo(() => {
    // Filter runners with valid PB data for this gender
    const runnersWithPB = runners.filter(r => {
      if (r.gender !== gender) return false
      const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years
      return pb !== null && pb > 0
    })

    // Group by nationality
    const teamGroups = new Map<string, Runner[]>()
    runnersWithPB.forEach(runner => {
      const key = runner.nationality
      if (!teamGroups.has(key)) {
        teamGroups.set(key, [])
      }
      teamGroups.get(key)!.push(runner)
    })

    // Calculate team totals
    const allTeams: Team[] = Array.from(teamGroups.entries()).map(([nationality, teamRunners]) => {
      // Sort runners by PB (descending)
      const sorted = teamRunners.sort((a, b) => {
        const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast2Years
        const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast2Years
        return (bVal || 0) - (aVal || 0)
      })

      // Take top 3
      const topThree = sorted.slice(0, 3)

      // Calculate team total
      const teamTotal = topThree.reduce((sum, r) => {
        const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years
        return sum + (pb || 0)
      }, 0)

      return {
        nationality,
        gender,
        runners: sorted,
        topThree,
        teamTotal,
      }
    })

    // Sort by team total (descending)
    return allTeams.sort((a, b) => b.teamTotal - a.teamTotal)
  }, [runners, metric, gender])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team predictions...</p>
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
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Team Predictions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Top 3 runners per country • IAU 24h WC 2025
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Gender Toggle */}
        <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
          <Button
            variant={gender === 'M' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setGender('M')}
            className={gender === 'M' ? '' : 'hover:bg-accent'}
          >
            Men
          </Button>
          <Button
            variant={gender === 'W' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setGender('W')}
            className={gender === 'W' ? '' : 'hover:bg-accent'}
          >
            Women
          </Button>
        </div>

        {/* Metric Toggle */}
        <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
          <Button
            variant={metric === 'last-2-years' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMetric('last-2-years')}
            className={metric === 'last-2-years' ? '' : 'hover:bg-accent'}
          >
            Last 3 Years
          </Button>
          <Button
            variant={metric === 'all-time' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMetric('all-time')}
            className={metric === 'all-time' ? '' : 'hover:bg-accent'}
          >
            All-Time
          </Button>
        </div>
      </div>

      {/* Teams */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          {gender === 'M' ? 'Men' : 'Women'} ({teams.length})
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team data available</p>
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

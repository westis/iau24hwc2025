'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Runner } from '@/types/runner'
import type { Team } from '@/types/team'
import { TeamCard } from '@/components/cards/team-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Download, Trophy, AlertCircle } from 'lucide-react'

type PBMetric = 'all-time' | 'last-2-years'

export default function RankingsPage() {
  const router = useRouter()
  const [runners, setRunners] = React.useState<Runner[]>([])
  const [metric, setMetric] = React.useState<PBMetric>('all-time')
  const [error, setError] = React.useState<string | null>(null)

  // Load runners from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('runners')
    if (stored) {
      try {
        const parsedRunners = JSON.parse(stored) as Runner[]
        setRunners(parsedRunners)

        // Check if runners have performance data
        const hasPerformanceData = parsedRunners.some(r =>
          r.personalBestAllTime !== null || r.personalBestLast2Years !== null
        )

        if (!hasPerformanceData) {
          setError('No performance data found. Please fetch performance data first.')
        }
      } catch (error) {
        console.error('Error loading runners from localStorage:', error)
        setError('Failed to load runners from storage')
      }
    } else {
      // No runners found, redirect to upload
      router.push('/upload')
    }
  }, [router])

  // Calculate team rankings
  const { menTeams, womenTeams } = React.useMemo(() => {
    return calculateTeamRankings(runners, metric)
  }, [runners, metric])

  const handleExportResults = () => {
    // Prepare export data
    const exportData = {
      metric,
      timestamp: new Date().toISOString(),
      menTeams: menTeams.map((team, index) => ({
        rank: index + 1,
        nationality: team.nationality,
        teamTotal: team.teamTotal,
        topThree: team.topThree.map(r => ({
          name: `${r.firstname} ${r.lastname}`,
          pb: metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years,
        })),
      })),
      womenTeams: womenTeams.map((team, index) => ({
        rank: index + 1,
        nationality: team.nationality,
        teamTotal: team.teamTotal,
        topThree: team.topThree.map(r => ({
          name: `${r.firstname} ${r.lastname}`,
          pb: metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years,
        })),
      })),
    }

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iau-24h-rankings-${metric}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleViewProfile = (duvId: number) => {
    window.open(`https://statistik.d-u-v.org/getperson.php?modus=0&PersonID=${duvId}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-slate-900">Team Rankings</h1>
          </div>
          <p className="text-xl text-slate-600">IAU 24h World Championships 2025</p>
        </div>

        {/* Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Controls</CardTitle>
            <CardDescription>
              Toggle between different PB metrics and export results
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

            {/* Metric Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Performance Metric</Label>
              <RadioGroup value={metric} onValueChange={(value) => setMetric(value as PBMetric)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all-time" id="all-time" />
                  <Label htmlFor="all-time" className="cursor-pointer">
                    All-Time Personal Best
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last-2-years" id="last-2-years" />
                  <Label htmlFor="last-2-years" className="cursor-pointer">
                    Last 3 Years Personal Best
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExportResults}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          </CardContent>
        </Card>

        {/* Men's Rankings */}
        {menTeams.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">Men&apos;s Teams</h2>
              <span className="text-sm text-slate-600">({menTeams.length} teams)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menTeams.map((team, index) => (
                <TeamCard
                  key={`${team.nationality}-M`}
                  rank={index + 1}
                  team={team}
                  gender="M"
                />
              ))}
            </div>
          </div>
        )}

        {/* Women's Rankings */}
        {womenTeams.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">Women&apos;s Teams</h2>
              <span className="text-sm text-slate-600">({womenTeams.length} teams)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {womenTeams.map((team, index) => (
                <TeamCard
                  key={`${team.nationality}-W`}
                  rank={index + 1}
                  team={team}
                  gender="W"
                />
              ))}
            </div>
          </div>
        )}

        {/* No Teams Message */}
        {menTeams.length === 0 && womenTeams.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">
                No team rankings available. Please ensure runners have performance data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/**
 * Calculate team rankings from runners array
 */
function calculateTeamRankings(
  runners: Runner[],
  metric: PBMetric
): { menTeams: Team[]; womenTeams: Team[] } {
  // Filter runners with valid PB data
  const runnersWithPB = runners.filter(r => {
    const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years
    return pb !== null && pb > 0
  })

  // Group by nationality + gender
  const teams = new Map<string, Runner[]>()

  runnersWithPB.forEach(runner => {
    const key = `${runner.nationality}-${runner.gender}`
    if (!teams.has(key)) {
      teams.set(key, [])
    }
    teams.get(key)!.push(runner)
  })

  // Calculate team totals and rankings
  const allTeams: Team[] = Array.from(teams.entries()).map(([key, teamRunners]) => {
    // Sort runners by selected PB metric (descending)
    const sorted = teamRunners.sort((a, b) => {
      const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast2Years
      const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast2Years
      return (bVal || 0) - (aVal || 0)
    })

    // Take top 3 runners
    const topThree = sorted.slice(0, 3)

    // Calculate team total (sum of top 3 PBs)
    const teamTotal = topThree.reduce((sum, r) => {
      const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years
      return sum + (pb || 0)
    }, 0)

    return {
      nationality: teamRunners[0].nationality,
      gender: teamRunners[0].gender,
      runners: teamRunners,
      topThree,
      teamTotal,
    }
  })

  // Sort teams by team total (descending)
  const sortedTeams = allTeams.sort((a, b) => b.teamTotal - a.teamTotal)

  // Separate men's and women's teams
  const menTeams = sortedTeams.filter(t => t.gender === 'M')
  const womenTeams = sortedTeams.filter(t => t.gender === 'W')

  return { menTeams, womenTeams }
}

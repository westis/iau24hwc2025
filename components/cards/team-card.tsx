'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import ReactCountryFlag from 'react-country-flag'
import type { Team } from '@/types/team'
import type { Gender } from '@/types/runner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getCountryCodeForFlag } from '@/lib/utils/country-codes'
import { getCountryName } from '@/lib/utils/country-names'

interface TeamCardProps {
  rank: number
  team: Team
  gender: Gender
  metric: 'all-time' | 'last-3-years'
}

// Get medal emoji for top 3 ranks
function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇'
    case 2:
      return '🥈'
    case 3:
      return '🥉'
    default:
      return ''
  }
}

export function TeamCard({ rank, team, gender, metric }: TeamCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const medal = getMedalEmoji(rank)
  const countryName = getCountryName(team.nationality)
  const twoLetterCode = getCountryCodeForFlag(team.nationality)
  const metricLabel = metric === 'last-3-years' ? 'Last 3 Years' : 'All-Time'

  return (
    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {medal && <span className="text-xl">{medal}</span>}
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-semibold">{team.teamTotal.toFixed(3)} km</div>
        </div>
      </div>

      {/* Country */}
      <div className="flex items-center gap-3 mb-3">
        <ReactCountryFlag
          countryCode={twoLetterCode}
          svg
          style={{
            width: '3em',
            height: '2em',
            borderRadius: '4px',
          }}
        />
        <div>
          <h3 className="font-semibold">{countryName}</h3>
          <p className="text-xs text-muted-foreground">
            {team.runners.length} runners • {metricLabel}
          </p>
        </div>
      </div>

      {/* Top 3 Runners - Collapsed */}
      {!isExpanded && (
        <div className="space-y-1.5">
          {team.topThree.map((runner, index) => {
            const pb = metric === 'all-time' ? runner.personalBestAllTime : runner.personalBestLast3Years
            const pbYear = metric === 'all-time' ? runner.personalBestAllTimeYear : runner.personalBestLast3YearsYear
            return (
              <div
                key={runner.entryId}
                className="flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors"
                onClick={() => router.push(`/runners/${runner.entryId}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{index + 1}.</span>
                  <span className="truncate">{runner.firstname} {runner.lastname}</span>
                </div>
                {pb && (
                  <span className="text-muted-foreground text-xs">
                    {pb.toFixed(3)} {pbYear && `(${pbYear})`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All Runners - Expanded */}
      {isExpanded && (
        <div className="space-y-1.5">
          {team.runners.map((runner, index) => {
            const pb = metric === 'all-time' ? runner.personalBestAllTime : runner.personalBestLast3Years
            const pbYear = metric === 'all-time' ? runner.personalBestAllTimeYear : runner.personalBestLast3YearsYear
            const isTopThree = index < 3 && pb !== null && pb > 0
            return (
              <div
                key={runner.entryId}
                className={`flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors ${!isTopThree && 'opacity-50'}`}
                onClick={() => router.push(`/runners/${runner.entryId}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{index + 1}.</span>
                  <span className="truncate">
                    {runner.firstname} {runner.lastname}
                  </span>
                </div>
                {pb ? (
                  <span className="text-muted-foreground text-xs">
                    {pb.toFixed(3)} {pbYear && `(${pbYear})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs italic">No PB</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Expand/Collapse Button */}
      {team.runners.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>Show less <ChevronUp className="inline h-3 w-3" /></>
          ) : (
            <>Show all {team.runners.length} <ChevronDown className="inline h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  )
}

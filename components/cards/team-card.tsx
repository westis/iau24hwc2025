'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import ReactCountryFlag from 'react-country-flag'
import type { Team } from '@/types/team'
import type { Gender } from '@/types/runner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { getCountryCodeForFlag } from '@/lib/utils/country-codes'
import { getCountryName } from '@/lib/utils/country-names'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const medal = getMedalEmoji(rank)
  const countryName = getCountryName(team.nationality)
  const twoLetterCode = getCountryCodeForFlag(team.nationality)
  const metricLabel = metric === 'last-3-years' ? t.teams.last3Years : t.teams.allTime

  return (
    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {medal && <span className="text-xl">{medal}</span>}
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t.teams.total}</div>
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
            {team.runners.length} {t.teams.runners} • {metricLabel}
          </p>
        </div>
      </div>

      {/* Top 3 Runners - Collapsed */}
      {!isExpanded && (
        <div className="space-y-1.5">
          {team.runners.slice(0, 3).map((runner, index) => {
            const pb = metric === 'all-time' ? runner.personalBestAllTime : runner.personalBestLast3Years
            const pbYear = metric === 'all-time' ? runner.personalBestAllTimeYear : runner.personalBestLast3YearsYear
            return (
              <div
                key={runner.entryId}
                className={cn(
                  "flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors",
                  runner.dns && "opacity-60"
                )}
                onClick={() => router.push(`/runners/${runner.entryId}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{index + 1}.</span>
                  <span className="truncate flex items-center gap-1.5">
                    <span>
                      {runner.firstname} {runner.lastname}
                      {runner.dns && <span className="text-xs text-muted-foreground ml-1">(DNS)</span>}
                    </span>
                    {(runner.noteCount ?? 0) > 0 && (
                      <span className="inline-flex items-center relative ml-1" title="Click to view notes">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="absolute -top-0.5 -right-0.5 bg-blue-600 dark:bg-blue-500 text-white text-[9px] font-semibold rounded-full h-3 w-3 flex items-center justify-center">
                          {runner.noteCount}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                {pb ? (
                  <span className="text-muted-foreground text-xs">
                    {pb.toFixed(3)} {pbYear && `(${pbYear})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs italic">{t.teams.noPB}</span>
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
            // Check if runner is in the actual top 3 (counting only non-DNS runners)
            const isInTopThree = team.topThree.some(r => r.entryId === runner.entryId)
            return (
              <div
                key={runner.entryId}
                className={cn(
                  "flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors",
                  !isInTopThree && !runner.dns && "opacity-50",
                  runner.dns && "opacity-60"
                )}
                onClick={() => router.push(`/runners/${runner.entryId}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{index + 1}.</span>
                  <span className="truncate flex items-center gap-1.5">
                    <span>
                      {runner.firstname} {runner.lastname}
                      {runner.dns && <span className="text-xs text-muted-foreground ml-1">(DNS)</span>}
                    </span>
                    {(runner.noteCount ?? 0) > 0 && (
                      <span className="inline-flex items-center relative ml-1" title="Click to view notes">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="absolute -top-0.5 -right-0.5 bg-blue-600 dark:bg-blue-500 text-white text-[9px] font-semibold rounded-full h-3 w-3 flex items-center justify-center">
                          {runner.noteCount}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                {pb ? (
                  <span className="text-muted-foreground text-xs">
                    {pb.toFixed(3)} {pbYear && `(${pbYear})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs italic">{t.teams.noPB}</span>
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
            <>{t.teams.showLess} <ChevronUp className="inline h-3 w-3" /></>
          ) : (
            <>{t.teams.showAll} {team.runners.length} <ChevronDown className="inline h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  )
}

// app/api/fetch-performances/route.ts - Fetch Performance Data API Route
import { NextRequest, NextResponse } from 'next/server'
import { getRunnerProfile } from '@/lib/api/duv-client'
import type { Runner, Performance } from '@/types/runner'

/**
 * POST /api/fetch-performances
 *
 * Accepts an array of matched runners, fetches their performance data from DUV,
 * and returns enriched runners with PB calculations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const runners = body.runners as Runner[]

    if (!Array.isArray(runners)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected array of runners.' },
        { status: 400 }
      )
    }

    // Filter runners with valid DUV IDs
    const matchedRunners = runners.filter(r => r.duvId !== null)

    if (matchedRunners.length === 0) {
      return NextResponse.json(
        { error: 'No matched runners found. All runners must have a duvId.' },
        { status: 400 }
      )
    }

    // Fetch performance data for each runner
    const enrichedRunners: Runner[] = []
    const errors: Array<{ entryId: string; error: string }> = []

    for (const runner of matchedRunners) {
      try {
        if (!runner.duvId) continue

        // Fetch DUV profile
        const profile = await getRunnerProfile(runner.duvId)

        // Extract 24h race results
        const raceResults24h = profile.results.filter(result => {
          return result.Length === '24h' || result.Length === '24 h'
        })

        // Parse performances
        const performances: Performance[] = raceResults24h.map(result => ({
          eventId: result.EventID,
          eventName: result.Event,
          date: result.Startdate,
          distance: parseFloat(result.Performance) || 0,
          rank: result.Rank || 0,
          rankGender: result.RankGender,
          eventType: '24h',
        }))

        // Extract PBs from AllPBs array (more reliable than manual calculation)
        let personalBestAllTime: number | null = null
        let personalBestAllTimeYear: number | undefined
        let personalBestLast3Years: number | null = null
        let personalBestLast3YearsYear: number | undefined

        if (profile.allPBs && profile.allPBs.length > 0) {
          // Find 24h PBs entry
          const pb24h = profile.allPBs.find(pb => pb['24h'] || pb['24 h'])
          const pb24hData = pb24h?.['24h'] || pb24h?.['24 h']

          if (pb24hData && pb24hData.PB) {
            // Parse all-time PB
            const pbValue = parseFloat(pb24hData.PB)
            if (!isNaN(pbValue)) {
              personalBestAllTime = pbValue

              // Find the year of the all-time PB
              const yearKeys = Object.keys(pb24hData).filter(k => k !== 'PB' && !isNaN(parseInt(k)))
              if (yearKeys.length > 0) {
                // Find which year has the PB performance
                for (const year of yearKeys) {
                  const yearData = pb24hData[year]
                  if (typeof yearData === 'object' && yearData.Perf) {
                    const perfValue = parseFloat(yearData.Perf)
                    if (!isNaN(perfValue) && Math.abs(perfValue - pbValue) < 0.01) {
                      personalBestAllTimeYear = parseInt(year)
                      break
                    }
                  }
                }
              }

              // Calculate Last 3 Years PB (since Oct 2022)
              const raceDate = new Date('2025-10-17')
              const threeYearsAgo = new Date('2022-10-18')

              let best3Years: number | null = null
              let best3YearsYear: number | undefined

              for (const year of yearKeys) {
                const yearInt = parseInt(year)
                if (yearInt >= threeYearsAgo.getFullYear()) {
                  const yearData = pb24hData[year]
                  if (typeof yearData === 'object' && yearData.Perf) {
                    const perfValue = parseFloat(yearData.Perf)
                    if (!isNaN(perfValue) && (best3Years === null || perfValue > best3Years)) {
                      best3Years = perfValue
                      best3YearsYear = yearInt
                    }
                  }
                }
              }

              personalBestLast3Years = best3Years
              personalBestLast3YearsYear = best3YearsYear
            }
          }
        }

        // Calculate age from YOB
        let age: number | undefined
        if (profile.YOB) {
          age = new Date().getFullYear() - profile.YOB
        }

        // Create enriched runner
        enrichedRunners.push({
          ...runner,
          personalBestAllTime,
          personalBestAllTimeYear,
          personalBestLast3Years,
          personalBestLast3YearsYear,
          dateOfBirth: profile.YOB ? `${profile.YOB}-01-01` : null,
          age,
          performanceHistory: performances,
        })

      } catch (error) {
        console.error(`Error fetching performance for runner ${runner.entryId}:`, error)
        errors.push({
          entryId: runner.entryId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Include runner without performance data
        enrichedRunners.push(runner)
      }
    }

    // Include unmatched runners without changes
    const unmatchedRunners = runners.filter(r => r.duvId === null)
    const allRunners = [...enrichedRunners, ...unmatchedRunners]

    return NextResponse.json({
      runners: allRunners,
      successCount: enrichedRunners.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Fetch performances error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performances', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

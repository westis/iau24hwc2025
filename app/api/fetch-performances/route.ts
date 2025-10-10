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
          eventType: '24h',
        }))

        // Calculate PBs with years
        let personalBestAllTime: number | null = null
        let personalBestAllTimeYear: number | undefined
        let personalBestLast2Years: number | null = null
        let personalBestLast2YearsYear: number | undefined

        if (performances.length > 0) {
          // All-time PB
          const allTimeBest = performances.reduce((best, p) =>
            p.distance > (best?.distance || 0) ? p : best
          , performances[0])

          personalBestAllTime = allTimeBest.distance
          personalBestAllTimeYear = new Date(allTimeBest.date).getFullYear()

          // Last 3 years PB
          const threeYearsAgo = new Date()
          threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

          const recentPerformances = performances.filter(p => {
            const performanceDate = new Date(p.date)
            return performanceDate >= threeYearsAgo
          })

          if (recentPerformances.length > 0) {
            const recentBest = recentPerformances.reduce((best, p) =>
              p.distance > (best?.distance || 0) ? p : best
            , recentPerformances[0])

            personalBestLast2Years = recentBest.distance
            personalBestLast2YearsYear = new Date(recentBest.date).getFullYear()
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
          personalBestLast2Years,
          personalBestLast2YearsYear,
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

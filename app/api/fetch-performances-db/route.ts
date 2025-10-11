// app/api/fetch-performances-db/route.ts - Fetch DUV performance data with database persistence
import { NextRequest, NextResponse } from 'next/server'
import { getRunnerProfile } from '@/lib/api/duv-client'
import { updateRunner, insertPerformance, getRunners, getDatabase } from '@/lib/db/database'
import type { Runner } from '@/types/runner'

export async function POST(request: NextRequest) {
  console.log('='.repeat(80))
  console.log('fetch-performances-db API called')
  console.log('='.repeat(80))

  try {
    const body = await request.json()
    console.log('Received body:', JSON.stringify(body, null, 2))

    const { runners } = body as { runners: Runner[] }

    if (!Array.isArray(runners)) {
      console.error('ERROR: runners is not an array:', runners)
      return NextResponse.json(
        { error: 'Invalid request: runners array required' },
        { status: 400 }
      )
    }

    console.log(`Processing ${runners.length} runner(s)`)

    const enrichedRunners: Runner[] = []

    for (const runner of runners) {
      console.log('\n' + '-'.repeat(60))
      console.log(`Processing runner: ${runner.firstname} ${runner.lastname}`)
      console.log(`  Entry ID: ${runner.entryId}`)
      console.log(`  DUV ID: ${runner.duvId}`)
      console.log(`  Match Status: ${runner.matchStatus}`)
      console.log(`  Full runner object:`, JSON.stringify(runner, null, 2))

      if (!runner.duvId) {
        console.log(`  Skipping - no DUV ID`)
        enrichedRunners.push(runner)
        continue
      }

      try {
        console.log(`  Fetching profile from DUV for DUV ID: ${runner.duvId}`)
        const profile = await getRunnerProfile(runner.duvId)

        // Get all race results
        const allResults = profile.results

        // Extract PBs from AllPBs array (more reliable than manual calculation)
        let pbAllTime: number | null = null
        let pbAllTimeYear: number | undefined
        let pbLast3Years: number | null = null
        let pbLast3YearsYear: number | undefined

        if (profile.allPBs && profile.allPBs.length > 0) {
          // Find 24h PBs entry
          const pb24h = profile.allPBs.find(pb => pb['24h'] || pb['24 h'])
          const pb24hData = pb24h?.['24h'] || pb24h?.['24 h']

          if (pb24hData && pb24hData.PB) {
            // Parse all-time PB
            const pbValue = parseFloat(pb24hData.PB)
            if (!isNaN(pbValue)) {
              pbAllTime = pbValue

              // Find the year of the all-time PB
              const yearKeys = Object.keys(pb24hData).filter(k => k !== 'PB' && !isNaN(parseInt(k)))
              if (yearKeys.length > 0) {
                // Find which year has the PB performance
                for (const year of yearKeys) {
                  const yearData = pb24hData[year]
                  if (typeof yearData === 'object' && yearData.Perf) {
                    const perfValue = parseFloat(yearData.Perf)
                    if (!isNaN(perfValue) && Math.abs(perfValue - pbValue) < 0.01) {
                      pbAllTimeYear = parseInt(year)
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

              pbLast3Years = best3Years
              pbLast3YearsYear = best3YearsYear
            }
          }
        }

        // Calculate age from YOB
        const currentYear = new Date().getFullYear()
        const age = profile.YOB ? currentYear - profile.YOB : null

        console.log(`  Calculated PBs - All-time: ${pbAllTime}, Last 3Y: ${pbLast3Years}`)
        console.log(`  Found ${allResults.length} performance records`)

        // Update runner in database
        console.log(`  Updating runner in DB with entry_id: ${runner.entryId}`)
        await updateRunner(runner.entryId, {
          personalBestAllTime: pbAllTime,
          personalBestLast3Years: pbLast3Years,
          dateOfBirth: profile.YOB ? `${profile.YOB}-01-01` : null,
          age: age || undefined,
        })
        console.log(`  ✓ Runner updated in database`)

        // Save performance history (all events, not just 24h)
        const db = getDatabase()
        const runnerResult = await db.query('SELECT id FROM runners WHERE entry_id = $1', [runner.entryId])
        const runnerRow = runnerResult.rows[0]

        if (runnerRow) {
          console.log(`  Found runner in DB with id: ${runnerRow.id}`)
          // Clear existing performances
          const deleteResult = await db.query('DELETE FROM performances WHERE runner_id = $1', [runnerRow.id])
          console.log(`  Deleted ${deleteResult.rowCount} old performances`)

          // Insert all performances
          let insertedCount = 0
          for (const result of allResults) {
            const distance = parseFloat(result.Performance.replace(/[^\d.]/g, ''))
            if (!isNaN(distance)) {
              await insertPerformance(runnerRow.id, {
                eventId: result.EventID,
                eventName: result.Event,
                date: result.Startdate,
                distance,
                rank: result.Rank,
                eventType: result.Length,
              })
              insertedCount++
            }
          }
          console.log(`  ✓ Inserted ${insertedCount} performance records`)
        } else {
          console.error(`  ✗ WARNING: Could not find runner in DB with entry_id: ${runner.entryId}`)
        }

        enrichedRunners.push({
          ...runner,
          personalBestAllTime: pbAllTime,
          personalBestLast3Years: pbLast3Years,
          dateOfBirth: profile.YOB ? `${profile.YOB}-01-01` : null,
          age: age || undefined,
        })
      } catch (error) {
        console.error(`  ✗ FAILED to fetch profile for runner ${runner.firstname} ${runner.lastname} (${runner.entryId}):`, error)
        console.error(`  Error details:`, error instanceof Error ? error.message : String(error))

        // NOTE: DUV REST API (/api/runner/{id}) may return 404 even for valid PersonIDs
        // that exist in the web interface (getresultperson.php?runner={id})
        // We DO NOT clear manual matches on API failures
        if (error instanceof Error && (error.message.includes('Runner not found') || error.message.includes('404'))) {
          console.error(`  ⚠️  DUV API returned 404 for PersonID ${runner.duvId}`)
          console.error(`  ⚠️  This may be a valid PersonID that's not in the REST API`)
          console.error(`  ⚠️  Manual matches will NOT be cleared. Check web interface: https://statistik.d-u-v.org/getresultperson.php?runner=${runner.duvId}`)
        }

        enrichedRunners.push(runner)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`COMPLETED processing ${runners.length} runners. ${enrichedRunners.length} enriched.`)
    console.log('='.repeat(60))

    // Get fresh data from database and verify
    console.log('\nReading fresh data from database...')
    const updatedRunners = await getRunners()
    console.log(`Found ${updatedRunners.length} runners in database`)

    // Verify the updates were saved
    console.log('\nVERIFYING UPDATES:')
    for (const runner of runners) {
      if (runner.duvId) {
        const updated = updatedRunners.find(r => r.entryId === runner.entryId)
        if (updated) {
          console.log(`\n  ✓ ${runner.firstname} ${runner.lastname}:`)
          console.log(`    Entry ID: ${updated.entryId}`)
          console.log(`    DUV ID: ${updated.duvId}`)
          console.log(`    PB All-Time: ${updated.personalBestAllTime}`)
          console.log(`    PB Last 3Y: ${updated.personalBestLast3Years}`)
          console.log(`    Age: ${updated.age}`)
        } else {
          console.error(`  ✗ Could not find updated runner with entry_id: ${runner.entryId}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('API CALL COMPLETE - Returning response')
    console.log('='.repeat(60) + '\n')

    return NextResponse.json({
      runners: updatedRunners,
      count: updatedRunners.length,
    })
  } catch (error) {
    console.error('\n' + '!'.repeat(60))
    console.error('FATAL ERROR in fetch-performances-db:')
    console.error(error)
    console.error('!'.repeat(60) + '\n')
    return NextResponse.json(
      { error: 'Failed to fetch performance data', details: String(error) },
      { status: 500 }
    )
  }
}

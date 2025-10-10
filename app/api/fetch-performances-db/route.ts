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
        // Filter 24h races for PB calculation
        const race24h = allResults.filter(r => r.Length.toLowerCase().includes('24h') || r.Length.toLowerCase().includes('24 h'))

        // Calculate PBs (only for 24h races)
        let pbAllTime: number | null = null
        let pbLast3Years: number | null = null

        const threeYearsAgo = new Date()
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

        race24h.forEach(result => {
          const distance = parseFloat(result.Performance.replace(/[^\d.]/g, ''))
          if (isNaN(distance)) return

          if (pbAllTime === null || distance > pbAllTime) {
            pbAllTime = distance
          }

          const raceDate = new Date(result.Startdate)
          if (raceDate >= threeYearsAgo && (pbLast3Years === null || distance > pbLast3Years)) {
            pbLast3Years = distance
          }
        })

        // Calculate age from YOB
        const currentYear = new Date().getFullYear()
        const age = profile.YOB ? currentYear - profile.YOB : null

        console.log(`  Calculated PBs - All-time: ${pbAllTime}, Last 3Y: ${pbLast3Years}`)
        console.log(`  Found ${allResults.length} performance records`)

        // Update runner in database
        console.log(`  Updating runner in DB with entry_id: ${runner.entryId}`)
        updateRunner(runner.entryId, {
          personalBestAllTime: pbAllTime,
          personalBestLast3Years: pbLast3Years,
          dateOfBirth: profile.YOB ? `${profile.YOB}-01-01` : null,
          age: age || undefined,
        })
        console.log(`  ✓ Runner updated in database`)

        // Save performance history (all events, not just 24h)
        const db = getDatabase()
        const runnerRow = db.prepare('SELECT id FROM runners WHERE entry_id = ?').get(runner.entryId) as any

        if (runnerRow) {
          console.log(`  Found runner in DB with id: ${runnerRow.id}`)
          // Clear existing performances
          const deleteResult = db.prepare('DELETE FROM performances WHERE runner_id = ?').run(runnerRow.id)
          console.log(`  Deleted ${deleteResult.changes} old performances`)

          // Insert all performances
          let insertedCount = 0
          allResults.forEach(result => {
            const distance = parseFloat(result.Performance.replace(/[^\d.]/g, ''))
            if (!isNaN(distance)) {
              insertPerformance(runnerRow.id, {
                eventId: result.EventID,
                eventName: result.Event,
                date: result.Startdate,
                distance,
                rank: result.Rank,
                eventType: result.Length,
              })
              insertedCount++
            }
          })
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
    const updatedRunners = getRunners()
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

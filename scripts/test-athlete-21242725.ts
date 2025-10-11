#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { fetchCompleteAthleteData } from '../lib/strava/api'

async function testFetchAthlete() {
  const athleteId = 21242725

  console.log(`Testing fetchCompleteAthleteData(${athleteId})...`)

  try {
    const data = await fetchCompleteAthleteData(athleteId)

    console.log('\n✓ Success!')
    console.log(`Profile: ${data.profile.firstname} ${data.profile.lastname}`)
    console.log(`Location: ${data.profile.city}, ${data.profile.country}`)
    console.log(`Activities: ${data.activities.length} runs in last 12 weeks`)
    console.log(`\nMetrics:`)
    console.log(`  Last 4 weeks: ${data.metrics.last4Weeks.distance.toFixed(0)} km (${data.metrics.last4Weeks.count} runs)`)
    console.log(`  Last 8 weeks: ${data.metrics.last8Weeks.distance.toFixed(0)} km (${data.metrics.last8Weeks.count} runs)`)
    console.log(`  Last 12 weeks: ${data.metrics.last12Weeks.distance.toFixed(0)} km (${data.metrics.last12Weeks.count} runs)`)
    console.log(`  Longest run: ${data.metrics.longestRun.toFixed(1)} km`)
    console.log(`  Biggest week: ${data.metrics.biggestWeek.toFixed(0)} km`)

  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
  }
}

testFetchAthlete()

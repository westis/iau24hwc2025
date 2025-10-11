#!/usr/bin/env tsx
// scripts/test-strava.ts - Test Strava API connection

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function testStravaAPI() {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN

  console.log('Testing Strava API...')
  console.log('Access token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT SET')

  if (!accessToken) {
    console.error('❌ STRAVA_ACCESS_TOKEN not found in .env.local')
    return
  }

  try {
    // Test 1: Get athlete (yourself)
    console.log('\n1. Testing GET /athlete...')
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!athleteResponse.ok) {
      const error = await athleteResponse.text()
      console.error(`❌ Failed: ${athleteResponse.status} ${athleteResponse.statusText}`)
      console.error('Error:', error)
      return
    }

    const athlete = await athleteResponse.json()
    console.log(`✓ Success! Authenticated as: ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id})`)

    // Test 2: Get activities
    console.log('\n2. Testing GET /athlete/activities...')
    const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=5', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!activitiesResponse.ok) {
      const error = await activitiesResponse.text()
      console.error(`❌ Failed: ${activitiesResponse.status} ${activitiesResponse.statusText}`)
      console.error('Error:', error)
      return
    }

    const activities = await activitiesResponse.json()
    console.log(`✓ Success! Retrieved ${activities.length} recent activities`)

    // Test 3: Get specific athlete stats
    console.log('\n3. Testing GET /athletes/{id}/stats...')
    const statsResponse = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!statsResponse.ok) {
      const error = await statsResponse.text()
      console.error(`❌ Failed: ${statsResponse.status} ${statsResponse.statusText}`)
      console.error('Error:', error)
      return
    }

    const stats = await statsResponse.json()
    console.log(`✓ Success! Got athlete stats`)
    console.log(`  Recent runs: ${stats.recent_run_totals.count} runs, ${(stats.recent_run_totals.distance / 1000).toFixed(1)} km`)

    console.log('\n✅ All Strava API tests passed!')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
  }
}

testStravaAPI()

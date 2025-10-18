#!/usr/bin/env tsx
// Check lap times for specific bibs to debug incorrect values

import { getDatabase } from '../lib/db/database'

async function main() {
  const db = getDatabase()
  const bibs = [94, 212]

  for (const bib of bibs) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Bib ${bib} - Latest 3 laps:`)
    console.log('='.repeat(60))

    const result = await db.query(`
      SELECT
        bib,
        lap,
        lap_time_sec,
        race_time_sec,
        distance_km,
        timestamp
      FROM race_laps
      WHERE race_id = 1 AND bib = $1
      ORDER BY lap DESC
      LIMIT 3
    `, [bib])

    console.table(result.rows)

    // Check what the leaderboard shows
    const leaderboardResult = await db.query(`
      SELECT
        bib,
        lap,
        lap_time_sec,
        race_time_sec,
        distance_km
      FROM race_leaderboard
      WHERE race_id = 1 AND bib = $1
    `, [bib])

    console.log(`\nLeaderboard current state:`)
    console.table(leaderboardResult.rows)
  }

  process.exit(0)
}

main().catch(console.error)

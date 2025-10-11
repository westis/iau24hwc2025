#!/usr/bin/env tsx
// scripts/refetch-performances.ts - Refetch performance history with gender rankings

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { getDatabase } from '../lib/db/database'
import { getRunnerProfile } from '../lib/api/duv-client'

async function main() {
  const db = getDatabase()
  console.log('Loading runners from Supabase...')

  // Fetch all runners with DUV IDs
  const result = await db.query('SELECT * FROM runners WHERE duv_id IS NOT NULL ORDER BY entry_id')
  const runners = result.rows

  console.log(`\nFound ${runners.length} runners with DUV IDs\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < runners.length; i++) {
    const runner = runners[i]
    console.log(`[${i + 1}/${runners.length}] ${runner.firstname} ${runner.lastname} (DUV: ${runner.duv_id})`)

    try {
      // Fetch runner profile from DUV
      const profile = await getRunnerProfile(runner.duv_id)

      // Delete existing performances for this runner
      await db.query('DELETE FROM performances WHERE runner_id = $1', [runner.id])

      // Insert new performances with gender rankings
      let insertedCount = 0
      for (const yearData of profile.results) {
        const perf = yearData

        // Parse distance/time
        let distance = 0
        if (perf.Performance) {
          // Check if it's a time format (contains ":")
          if (perf.Performance.includes(':')) {
            // Parse time string like "10:08:00 h" and convert to total seconds
            const timeMatch = perf.Performance.match(/(\d+):(\d+):(\d+)/)
            if (timeMatch) {
              const hours = parseInt(timeMatch[1], 10)
              const minutes = parseInt(timeMatch[2], 10)
              const seconds = parseInt(timeMatch[3], 10)
              distance = hours * 3600 + minutes * 60 + seconds
            }
          } else {
            // For distance-based results (km), parse as float
            const perfFloat = parseFloat(perf.Performance)
            if (!isNaN(perfFloat)) {
              distance = perfFloat
            }
          }
        }

        // Parse ranks
        const rankOverall = perf.Rank || 0
        const rankGender = perf.RankGender

        await db.query(`
          INSERT INTO performances (
            runner_id, event_id, event_name, event_date,
            distance, rank, rank_gender, event_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          runner.id,
          perf.EventID || 0,
          perf.Event || '',
          perf.Startdate || '',
          distance,
          rankOverall,
          rankGender,
          perf.Length || ''
        ])
        insertedCount++
      }

      console.log(`  ✓ Inserted ${insertedCount} performances`)
      successCount++

      // Rate limit: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.log(`  ✗ Error:`, error instanceof Error ? error.message : String(error))
      errorCount++
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Refetch complete: ${successCount} successful, ${errorCount} errors`)
  console.log(`${'='.repeat(60)}\n`)

  if (successCount > 0) {
    console.log(`✓ Updated ${successCount} runners in Supabase`)
    console.log(`✓ Performance history now includes gender rankings!\n`)
  } else {
    console.log('No changes made.\n')
  }

  process.exit(0)
}

main().catch(console.error)

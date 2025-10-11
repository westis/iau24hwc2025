#!/usr/bin/env tsx
// scripts/fetch-pbs.ts - Fetch PBs from DUV and update Supabase directly

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { getDatabase } from '../lib/db/database'

// DUV API configuration
const DUV_JSON_API_BASE = 'https://statistik.d-u-v.org/json'

interface DUVPersonalBest {
  PB: string
  [year: string]: string | {
    Perf: string
    RankIntNat?: string
  }
}

interface DUVRunnerProfile {
  PersonID: number
  Lastname: string
  Firstname: string
  YOB: number | null
  Gender: string
  Nationality: string
  allPBs?: Array<{
    [distance: string]: DUVPersonalBest
  }>
}

async function getRunnerProfile(personId: number): Promise<DUVRunnerProfile> {
  const url = `${DUV_JSON_API_BASE}/mgetresultperson.php?runner=${personId}&plain=1`
  console.log(`  Fetching: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`DUV API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Parse YOB correctly from JSON endpoint
  const personHeader = data.PersonHeader || {}
  const yobStr = personHeader.YOB
  let yob: number | null = null
  if (yobStr && yobStr !== '0000' && yobStr !== '&nbsp;') {
    try {
      yob = parseInt(yobStr, 10)
    } catch {
      yob = null
    }
  }

  return {
    PersonID: personId,
    Lastname: personHeader.Lastname || '',
    Firstname: personHeader.Firstname || '',
    YOB: yob,
    Gender: personHeader.Sex || '',
    Nationality: personHeader.Nation || '',
    allPBs: data.AllPBs || [],
  }
}

async function main() {
  const db = getDatabase()
  console.log('Loading runners from Supabase...')

  // Fetch all runners from database
  const result = await db.query('SELECT * FROM runners ORDER BY entry_id')
  const runners = result.rows

  console.log(`\nFound ${runners.length} runners in database`)

  // Filter runners with DUV IDs
  const runnersWithDuvId = runners.filter((r: any) => r.duv_id)
  console.log(`Found ${runnersWithDuvId.length} runners with DUV IDs\n`)

  // Ask which filter to use
  const args = process.argv.slice(2)
  const filter = args[0] || 'all'

  let runnersToFetch = runnersWithDuvId

  if (filter === 'missing') {
    runnersToFetch = runnersWithDuvId.filter((r: any) =>
      !r.personal_best_all_time && !r.personal_best_last_2_years
    )
    console.log(`Filter: missing - fetching ${runnersToFetch.length} runners without PBs`)
  } else if (filter === 'manual') {
    runnersToFetch = runnersWithDuvId.filter((r: any) =>
      r.match_status === 'manually-matched'
    )
    console.log(`Filter: manual - fetching ${runnersToFetch.length} manually-matched runners`)
  } else {
    console.log(`Filter: all - fetching ${runnersToFetch.length} runners\n`)
  }

  if (runnersToFetch.length === 0) {
    console.log('No runners to fetch. Exiting.')
    return
  }

  console.log(`\nStarting PB fetch...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < runnersToFetch.length; i++) {
    const runner = runnersToFetch[i]
    console.log(`[${i + 1}/${runnersToFetch.length}] ${runner.firstname} ${runner.lastname} (DUV: ${runner.duv_id})`)

    try {
      const profile = await getRunnerProfile(runner.duv_id)

      // Extract PBs from AllPBs array
      let pbAllTime: number | null = null
      let pbAllTimeYear: number | null = null
      let pbLast3Years: number | null = null
      let pbLast3YearsYear: number | null = null

      if (profile.allPBs && profile.allPBs.length > 0) {
        const pb24h = profile.allPBs.find(pb => pb['24h'] || pb['24 h'])
        const pb24hData = pb24h?.['24h'] || pb24h?.['24 h']

        if (pb24hData && pb24hData.PB) {
          const pbValue = parseFloat(pb24hData.PB)
          if (!isNaN(pbValue)) {
            pbAllTime = pbValue

            const yearKeys = Object.keys(pb24hData).filter(k => k !== 'PB' && !isNaN(parseInt(k)))

            // Find year of all-time PB
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

            // Calculate Last 3 Years PB (2023-2025 full years)
            let best3Years: number | null = null
            let best3YearsYear: number | null = null

            for (const year of yearKeys) {
              const yearInt = parseInt(year)
              if (yearInt >= 2023 && yearInt <= 2025) {
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

      // Calculate age
      const currentYear = new Date().getFullYear()
      const age = profile.YOB ? currentYear - profile.YOB : null

      // Update runner directly in Supabase
      await db.query(`
        UPDATE runners SET
          personal_best_all_time = $1,
          personal_best_all_time_year = $2,
          personal_best_last_2_years = $3,
          personal_best_last_2_years_year = $4,
          date_of_birth = $5,
          age = $6,
          all_pbs = $7
        WHERE id = $8
      `, [
        pbAllTime,
        pbAllTimeYear,
        pbLast3Years,
        pbLast3YearsYear,
        profile.YOB ? `${profile.YOB}-01-01` : null,
        age,
        JSON.stringify(profile.allPBs || []),
        runner.id
      ])

      console.log(`  ✓ All-time: ${pbAllTime ? pbAllTime.toFixed(3) : 'N/A'} (${pbAllTimeYear || 'N/A'}) | Last 3Y: ${pbLast3Years ? pbLast3Years.toFixed(3) : 'N/A'} (${pbLast3YearsYear || 'N/A'})`)
      successCount++

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.log(`  ✗ Error:`, error instanceof Error ? error.message : String(error))
      errorCount++
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Fetch complete: ${successCount} successful, ${errorCount} errors`)
  console.log(`${'='.repeat(60)}\n`)

  if (successCount > 0) {
    console.log(`✓ Updated ${successCount} runners in Supabase`)
    console.log(`✓ Data is now available on both local and Vercel!`)
    console.log(`\nRefresh your app to see the updated PBs (6h, 12h, 48h, etc.)\n`)
  } else {
    console.log('No changes made.\n')
  }

  process.exit(0)
}

main().catch(console.error)

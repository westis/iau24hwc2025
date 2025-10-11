#!/usr/bin/env tsx
// scripts/fetch-pbs.ts - Fetch PBs from DUV and update seed-data.json

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

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
  const seedPath = join(process.cwd(), 'data', 'seed-data.json')
  console.log('Loading seed data from:', seedPath)

  const seedData = JSON.parse(readFileSync(seedPath, 'utf-8'))
  const runners = seedData.runners

  console.log(`\nFound ${runners.length} runners in seed data`)

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

            // Calculate Last 3 Years PB (since Oct 2022)
            const threeYearsAgo = new Date('2022-10-18')
            let best3Years: number | null = null
            let best3YearsYear: number | null = null

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

      // Calculate age
      const currentYear = new Date().getFullYear()
      const age = profile.YOB ? currentYear - profile.YOB : null

      // Update runner in seed data
      const index = runners.findIndex((r: any) => r.duv_id === runner.duv_id)
      if (index !== -1) {
        runners[index].personal_best_all_time = pbAllTime
        runners[index].personal_best_all_time_year = pbAllTimeYear
        runners[index].personal_best_last_2_years = pbLast3Years
        runners[index].personal_best_last_2_years_year = pbLast3YearsYear
        runners[index].date_of_birth = profile.YOB ? `${profile.YOB}-01-01` : null
        runners[index].age = age

        console.log(`  ✓ All-time: ${pbAllTime ? pbAllTime.toFixed(3) : 'N/A'} (${pbAllTimeYear || 'N/A'}) | Last 3Y: ${pbLast3Years ? pbLast3Years.toFixed(3) : 'N/A'} (${pbLast3YearsYear || 'N/A'})`)
        successCount++
      }

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.log(`  ✗ Error:`, error instanceof Error ? error.message : String(error))
      errorCount++
    }
  }

  // Save updated seed data
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Fetch complete: ${successCount} successful, ${errorCount} errors`)
  console.log(`${'='.repeat(60)}\n`)

  if (successCount > 0) {
    seedData.version = (seedData.version || 1) + 1
    seedData.updatedAt = new Date().toISOString()

    writeFileSync(seedPath, JSON.stringify(seedData, null, 2))
    console.log(`✓ Saved to ${seedPath}`)
    console.log(`✓ Version bumped to ${seedData.version}`)
    console.log(`\nNext steps:`)
    console.log(`  1. git add data/seed-data.json`)
    console.log(`  2. git commit -m "Update PBs from DUV (${successCount} runners)"`)
    console.log(`  3. git push origin main`)
    console.log(`\nVercel will auto-deploy and all users will see the updated PBs!\n`)
  } else {
    console.log('No changes made.\n')
  }
}

main().catch(console.error)

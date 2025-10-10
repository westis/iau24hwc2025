// app/api/fetch-performances-blob/route.ts - Fetch PBs and save to Vercel Blob
import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import { getRunnerProfile } from '@/lib/api/duv-client'
import type { Runner } from '@/types/runner'
import { readFileSync } from 'fs'
import { join } from 'path'

const BLOB_NAME = 'runners.json'

export async function POST(request: NextRequest) {
  console.log('='.repeat(80))
  console.log('fetch-performances-blob API called')
  console.log('='.repeat(80))

  try {
    const body = await request.json()
    const { runners: runnersToEnrich } = body as { runners: Runner[] }

    if (!Array.isArray(runnersToEnrich)) {
      return NextResponse.json(
        { error: 'Invalid request: runners array required' },
        { status: 400 }
      )
    }

    console.log(`Processing ${runnersToEnrich.length} runner(s)`)

    // Load ALL runners from blob (or seed)
    let allRunners: Runner[] = []
    let version = 1

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await head(BLOB_NAME, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        if (blob) {
          const response = await fetch(blob.url)
          const data = await response.json()
          allRunners = data.runners || []
          version = data.version || 1
          console.log(`Loaded ${allRunners.length} runners from blob`)
        }
      } catch (err) {
        console.log('Blob not found, loading from seed.json')
      }
    }

    // Fallback to seed if blob not available
    if (allRunners.length === 0) {
      const seedPath = join(process.cwd(), 'public', 'seed.json')
      const seedData = JSON.parse(readFileSync(seedPath, 'utf-8'))
      allRunners = seedData.runners
      version = seedData.version
      console.log(`Loaded ${allRunners.length} runners from seed.json`)
    }

    // Enrich the specific runners
    let successCount = 0
    for (const runnerToEnrich of runnersToEnrich) {
      console.log(`\nProcessing: ${runnerToEnrich.firstname} ${runnerToEnrich.lastname}`)

      if (!runnerToEnrich.duvId) {
        console.log('  Skipping - no DUV ID')
        continue
      }

      try {
        console.log(`  Fetching profile from DUV for DUV ID: ${runnerToEnrich.duvId}`)
        const profile = await getRunnerProfile(runnerToEnrich.duvId)

        // Extract PBs from AllPBs array
        let pbAllTime: number | null = null
        let pbAllTimeYear: number | undefined
        let pbLast3Years: number | null = null
        let pbLast3YearsYear: number | undefined

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

              // Calculate Last 3 Years PB
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

        const currentYear = new Date().getFullYear()
        const age = profile.YOB ? currentYear - profile.YOB : null

        console.log(`  Calculated PBs - All-time: ${pbAllTime}, Last 3Y: ${pbLast3Years}`)

        // Find and update this runner in allRunners array
        const index = allRunners.findIndex(r => r.entryId === runnerToEnrich.entryId)
        if (index !== -1) {
          allRunners[index] = {
            ...allRunners[index],
            personalBestAllTime: pbAllTime,
            personalBestAllTimeYear: pbAllTimeYear,
            personalBestLast3Years: pbLast3Years,
            personalBestLast3YearsYear: pbLast3YearsYear,
            dateOfBirth: profile.YOB ? `${profile.YOB}-01-01` : null,
            age: age || undefined,
          }
          console.log(`  ✓ Updated runner in array`)
          successCount++
        } else {
          console.error(`  ✗ Could not find runner with entry_id: ${runnerToEnrich.entryId}`)
        }

      } catch (error) {
        console.error(`  ✗ FAILED to fetch profile:`, error)
      }
    }

    // Save all runners back to blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(
          BLOB_NAME,
          JSON.stringify({ runners: allRunners, version, updatedAt: new Date().toISOString() }),
          {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }
        )
        console.log(`✓ Saved ${allRunners.length} runners to blob at ${blob.url}`)
      } catch (err) {
        console.error('✗ Failed to save to blob:', err)
        return NextResponse.json(
          { error: 'Failed to save to blob storage', details: String(err) },
          { status: 500 }
        )
      }
    } else {
      console.warn('⚠️  BLOB_READ_WRITE_TOKEN not set - data not persisted!')
    }

    console.log(`\nCompleted: ${successCount}/${runnersToEnrich.length} runners enriched`)

    return NextResponse.json({
      success: true,
      runners: allRunners,
      count: allRunners.length,
      enriched: successCount,
    })

  } catch (error) {
    console.error('FATAL ERROR in fetch-performances-blob:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data', details: String(error) },
      { status: 500 }
    )
  }
}

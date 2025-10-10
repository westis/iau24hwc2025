// lib/blob/blob-storage.ts - Shared blob storage utilities
import { head, put } from '@vercel/blob'
import seedData from '@/data/seed-data.json'
import type { Runner, Gender, MatchStatus } from '@/types/runner'

const BLOB_NAME = 'runners.json'

interface RunnersData {
  runners: Runner[]
  version: number
  updatedAt?: string
  source?: string
}

/**
 * Transform database row format to Runner object (same as seed-loader.ts)
 */
function transformDBRunner(row: any): Runner {
  return {
    id: row.id,
    entryId: row.entry_id,
    firstname: row.firstname,
    lastname: row.lastname,
    nationality: row.nationality,
    gender: row.gender as Gender,
    duvId: row.duv_id,
    matchStatus: row.match_status as MatchStatus,
    matchConfidence: row.match_confidence ?? undefined,
    personalBestAllTime: row.personal_best_all_time,
    personalBestAllTimeYear: row.personal_best_all_time_year,
    personalBestLast3Years: row.personal_best_last_2_years, // DB uses old column name
    personalBestLast3YearsYear: row.personal_best_last_2_years_year,
    dateOfBirth: row.date_of_birth,
    age: row.age ?? undefined,
    performanceHistory: row.performanceHistory || [],
  }
}

/**
 * Load runners from Vercel Blob (or fallback to seed data)
 */
export async function loadRunnersFromBlob(): Promise<RunnersData> {
  // Try to get from Vercel Blob first
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await head(BLOB_NAME, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      if (blob) {
        const response = await fetch(blob.url)
        const data = await response.json()
        console.log(`Loaded ${data.runners?.length || 0} runners from Vercel Blob`)
        return data
      }
    } catch (blobError) {
      console.log('Blob not found or error, falling back to seed-data.json:', blobError)
    }
  }

  // Fallback to imported seed data - transform to camelCase
  console.log('Loading runners from seed-data.json (blob not available)')
  const rawRunners = (seedData as any).runners
  const transformedRunners = rawRunners.map(transformDBRunner)

  return {
    runners: transformedRunners,
    version: (seedData as any).version,
    source: 'seed-data.json'
  }
}

/**
 * Save runners to Vercel Blob
 */
export async function saveRunnersToBlob(runners: Runner[], version: number): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured')
  }

  const blob = await put(
    BLOB_NAME,
    JSON.stringify({
      runners,
      version,
      updatedAt: new Date().toISOString()
    }),
    {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  )

  console.log(`✓ Saved ${runners.length} runners to Vercel Blob at ${blob.url}`)
  return blob.url
}

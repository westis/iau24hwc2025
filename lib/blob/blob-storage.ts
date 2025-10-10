// lib/blob/blob-storage.ts - Shared blob storage utilities
import { head, put } from '@vercel/blob'
import seedData from '@/data/seed-data.json'
import type { Runner } from '@/types/runner'

const BLOB_NAME = 'runners.json'

interface RunnersData {
  runners: Runner[]
  version: number
  updatedAt?: string
  source?: string
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

  // Fallback to imported seed data
  console.log('Loading runners from seed-data.json (blob not available)')
  return {
    runners: (seedData as any).runners,
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

#!/usr/bin/env tsx
// migrations/add-strava-data-columns.ts - Add Strava data columns

import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  console.log('Adding Strava data columns to runners table...')

  try {
    await pool.query(`
      ALTER TABLE runners
      ADD COLUMN IF NOT EXISTS strava_athlete_id BIGINT,
      ADD COLUMN IF NOT EXISTS strava_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS strava_data JSONB,
      ADD COLUMN IF NOT EXISTS strava_last_fetched TIMESTAMP
    `)

    console.log('✓ Successfully added Strava data columns')
  } catch (error) {
    console.error('Error adding columns:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main().catch(console.error)

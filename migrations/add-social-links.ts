#!/usr/bin/env tsx
// migrations/add-social-links.ts - Add social media links to runners table

import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

// Load environment variables from .env.local
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

  console.log('Adding social media link columns to runners table...')

  try {
    await pool.query(`
      ALTER TABLE runners
      ADD COLUMN IF NOT EXISTS strava_url TEXT,
      ADD COLUMN IF NOT EXISTS instagram_url TEXT,
      ADD COLUMN IF NOT EXISTS twitter_url TEXT
    `)

    console.log('✓ Successfully added social media columns')
  } catch (error) {
    console.error('Error adding columns:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main().catch(console.error)

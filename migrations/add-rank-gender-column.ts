#!/usr/bin/env tsx
// Migration: Add rank_gender column to performances table

import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('Adding rank_gender column to performances table...')

    await pool.query(`
      ALTER TABLE performances
      ADD COLUMN IF NOT EXISTS rank_gender INTEGER
    `)

    console.log('✓ Successfully added rank_gender column')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

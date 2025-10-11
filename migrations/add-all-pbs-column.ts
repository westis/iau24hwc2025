#!/usr/bin/env tsx
// migrations/add-all-pbs-column.ts - Add all_pbs column to runners table

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

  console.log('Adding all_pbs column to runners table...')

  try {
    await pool.query(`
      ALTER TABLE runners
      ADD COLUMN IF NOT EXISTS all_pbs JSONB DEFAULT '[]'::jsonb
    `)

    console.log('✓ Successfully added all_pbs column')
  } catch (error) {
    console.error('Error adding column:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main().catch(console.error)

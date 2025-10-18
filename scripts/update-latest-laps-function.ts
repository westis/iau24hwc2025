#!/usr/bin/env tsx
// Update get_latest_laps_per_runner function to include lap_time_sec

import { getDatabase } from '../lib/db/database'

async function main() {
  const db = getDatabase()

  console.log('Updating get_latest_laps_per_runner function...')

  await db.query(`
    CREATE OR REPLACE FUNCTION get_latest_laps_per_runner(race_id_param integer)
    RETURNS TABLE (
      bib integer,
      lap integer,
      distance_km numeric,
      race_time_sec numeric,
      lap_time_sec numeric
    )
    LANGUAGE sql
    STABLE
    AS $$
      SELECT DISTINCT ON (bib)
        bib,
        lap,
        distance_km,
        race_time_sec,
        lap_time_sec
      FROM race_laps
      WHERE race_id = race_id_param
      ORDER BY bib, lap DESC;
    $$;
  `)

  console.log('✅ Function updated successfully!')
  process.exit(0)
}

main().catch(console.error)

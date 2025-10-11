// scripts/migrate-to-supabase.ts
// Migrate data from SQLite to Supabase PostgreSQL

import Database from 'better-sqlite3'
import { Pool } from 'pg'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

const SQLITE_DB_PATH = join(process.cwd(), 'data', 'iau24hwc.db')

async function migrate() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n')

  // Connect to SQLite
  console.log('📂 Opening SQLite database:', SQLITE_DB_PATH)
  const sqlite = new Database(SQLITE_DB_PATH, { readonly: true })

  // Connect to PostgreSQL/Supabase
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set!')
  }

  console.log('🔌 Connecting to Supabase PostgreSQL...')
  const pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    // Test connection
    await pg.query('SELECT NOW()')
    console.log('✅ Connected to Supabase!\n')

    // Migrate runners
    console.log('👥 Migrating runners...')
    const runners = sqlite.prepare('SELECT * FROM runners').all()
    console.log(`   Found ${runners.length} runners in SQLite`)

    for (const runner of runners) {
      await pg.query(`
        INSERT INTO runners (
          id, entry_id, firstname, lastname, nationality, gender, dns,
          duv_id, match_status, match_confidence,
          personal_best_all_time, personal_best_all_time_year,
          personal_best_last_2_years, personal_best_last_2_years_year,
          date_of_birth, age, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO NOTHING
      `, [
        runner.id,
        runner.entry_id,
        runner.firstname,
        runner.lastname,
        runner.nationality,
        runner.gender,
        false, // dns field (new, default to false)
        runner.duv_id,
        runner.match_status,
        runner.match_confidence,
        runner.personal_best_all_time,
        runner.personal_best_all_time_year,
        runner.personal_best_last_2_years,
        runner.personal_best_last_2_years_year,
        runner.date_of_birth,
        runner.age,
        runner.created_at,
        runner.updated_at
      ])
    }
    console.log(`   ✅ Migrated ${runners.length} runners\n`)

    // Migrate performances
    console.log('🏃 Migrating performances...')
    const performances = sqlite.prepare('SELECT * FROM performances').all()
    console.log(`   Found ${performances.length} performances in SQLite`)

    for (const perf of performances) {
      await pg.query(`
        INSERT INTO performances (
          id, runner_id, event_id, event_name, event_date,
          distance, rank, event_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        perf.id,
        perf.runner_id,
        perf.event_id,
        perf.event_name,
        perf.event_date,
        perf.distance,
        perf.rank,
        perf.event_type,
        perf.created_at
      ])
    }
    console.log(`   ✅ Migrated ${performances.length} performances\n`)

    // Migrate match candidates
    console.log('🔍 Migrating match candidates...')
    const candidates = sqlite.prepare('SELECT * FROM match_candidates').all()
    console.log(`   Found ${candidates.length} match candidates in SQLite`)

    for (const candidate of candidates) {
      await pg.query(`
        INSERT INTO match_candidates (
          id, runner_id, duv_person_id, lastname, firstname,
          year_of_birth, nation, sex, personal_best, confidence, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        candidate.id,
        candidate.runner_id,
        candidate.duv_person_id,
        candidate.lastname,
        candidate.firstname,
        candidate.year_of_birth,
        candidate.nation,
        candidate.sex,
        candidate.personal_best,
        candidate.confidence,
        candidate.created_at
      ])
    }
    console.log(`   ✅ Migrated ${candidates.length} match candidates\n`)

    // Migrate teams
    console.log('🏆 Migrating teams...')
    const teams = sqlite.prepare('SELECT * FROM teams').all()
    console.log(`   Found ${teams.length} teams in SQLite`)

    for (const team of teams) {
      await pg.query(`
        INSERT INTO teams (
          id, nationality, gender, metric, team_total, rank,
          runner1_id, runner2_id, runner3_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        team.id,
        team.nationality,
        team.gender,
        team.metric,
        team.team_total,
        team.rank,
        team.runner1_id,
        team.runner2_id,
        team.runner3_id,
        team.created_at,
        team.updated_at
      ])
    }
    console.log(`   ✅ Migrated ${teams.length} teams\n`)

    // Update sequences to match the highest IDs
    console.log('🔢 Updating PostgreSQL sequences...')
    await pg.query(`SELECT setval('runners_id_seq', (SELECT MAX(id) FROM runners))`)
    await pg.query(`SELECT setval('performances_id_seq', (SELECT MAX(id) FROM performances))`)
    await pg.query(`SELECT setval('match_candidates_id_seq', (SELECT MAX(id) FROM match_candidates))`)
    await pg.query(`SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams))`)
    console.log('   ✅ Sequences updated\n')

    console.log('🎉 Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Runners: ${runners.length}`)
    console.log(`   - Performances: ${performances.length}`)
    console.log(`   - Match candidates: ${candidates.length}`)
    console.log(`   - Teams: ${teams.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    sqlite.close()
    await pg.end()
  }
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

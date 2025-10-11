// scripts/export-sql.ts
// Export SQLite data as PostgreSQL INSERT statements

import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SQLITE_DB_PATH = join(process.cwd(), 'data', 'iau24hwc.db')
const OUTPUT_FILE = join(process.cwd(), 'data', 'export-to-supabase.sql')

function escapeString(str: string | null): string {
  if (str === null) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  return escapeString(String(val))
}

console.log('📂 Opening SQLite database:', SQLITE_DB_PATH)
const db = new Database(SQLITE_DB_PATH, { readonly: true })

let sql = '-- Supabase Import SQL\n'
sql += '-- Generated from SQLite database\n\n'

try {
  // Export runners
  console.log('👥 Exporting runners...')
  const runners = db.prepare('SELECT * FROM runners').all() as any[]
  console.log(`   Found ${runners.length} runners`)

  if (runners.length > 0) {
    sql += '-- Runners\n'
    for (const r of runners) {
      sql += `INSERT INTO runners (id, entry_id, firstname, lastname, nationality, gender, dns, duv_id, match_status, match_confidence, personal_best_all_time, personal_best_all_time_year, personal_best_last_2_years, personal_best_last_2_years_year, date_of_birth, age, created_at, updated_at) VALUES (${formatValue(r.id)}, ${formatValue(r.entry_id)}, ${formatValue(r.firstname)}, ${formatValue(r.lastname)}, ${formatValue(r.nationality)}, ${formatValue(r.gender)}, FALSE, ${formatValue(r.duv_id)}, ${formatValue(r.match_status)}, ${formatValue(r.match_confidence)}, ${formatValue(r.personal_best_all_time)}, ${formatValue(r.personal_best_all_time_year)}, ${formatValue(r.personal_best_last_2_years)}, ${formatValue(r.personal_best_last_2_years_year)}, ${formatValue(r.date_of_birth)}, ${formatValue(r.age)}, ${formatValue(r.created_at)}, ${formatValue(r.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`
    }
    sql += '\n'
  }

  // Export performances
  console.log('🏃 Exporting performances...')
  const performances = db.prepare('SELECT * FROM performances').all() as any[]
  console.log(`   Found ${performances.length} performances`)

  if (performances.length > 0) {
    sql += '-- Performances\n'
    for (const p of performances) {
      sql += `INSERT INTO performances (id, runner_id, event_id, event_name, event_date, distance, rank, event_type, created_at) VALUES (${formatValue(p.id)}, ${formatValue(p.runner_id)}, ${formatValue(p.event_id)}, ${formatValue(p.event_name)}, ${formatValue(p.event_date)}, ${formatValue(p.distance)}, ${formatValue(p.rank)}, ${formatValue(p.event_type)}, ${formatValue(p.created_at)}) ON CONFLICT (id) DO NOTHING;\n`
    }
    sql += '\n'
  }

  // Export match_candidates
  console.log('🔍 Exporting match candidates...')
  const candidates = db.prepare('SELECT * FROM match_candidates').all() as any[]
  console.log(`   Found ${candidates.length} match candidates`)

  if (candidates.length > 0) {
    sql += '-- Match Candidates\n'
    for (const c of candidates) {
      sql += `INSERT INTO match_candidates (id, runner_id, duv_person_id, lastname, firstname, year_of_birth, nation, sex, personal_best, confidence, created_at) VALUES (${formatValue(c.id)}, ${formatValue(c.runner_id)}, ${formatValue(c.duv_person_id)}, ${formatValue(c.lastname)}, ${formatValue(c.firstname)}, ${formatValue(c.year_of_birth)}, ${formatValue(c.nation)}, ${formatValue(c.sex)}, ${formatValue(c.personal_best)}, ${formatValue(c.confidence)}, ${formatValue(c.created_at)}) ON CONFLICT (id) DO NOTHING;\n`
    }
    sql += '\n'
  }

  // Export teams
  console.log('🏆 Exporting teams...')
  const teams = db.prepare('SELECT * FROM teams').all() as any[]
  console.log(`   Found ${teams.length} teams`)

  if (teams.length > 0) {
    sql += '-- Teams\n'
    for (const t of teams) {
      sql += `INSERT INTO teams (id, nationality, gender, metric, team_total, rank, runner1_id, runner2_id, runner3_id, created_at, updated_at) VALUES (${formatValue(t.id)}, ${formatValue(t.nationality)}, ${formatValue(t.gender)}, ${formatValue(t.metric)}, ${formatValue(t.team_total)}, ${formatValue(t.rank)}, ${formatValue(t.runner1_id)}, ${formatValue(t.runner2_id)}, ${formatValue(t.runner3_id)}, ${formatValue(t.created_at)}, ${formatValue(t.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`
    }
    sql += '\n'
  }

  // Update sequences
  sql += '-- Update sequences\n'
  sql += `SELECT setval('runners_id_seq', (SELECT MAX(id) FROM runners));\n`
  sql += `SELECT setval('performances_id_seq', (SELECT MAX(id) FROM performances));\n`
  sql += `SELECT setval('match_candidates_id_seq', (SELECT MAX(id) FROM match_candidates));\n`
  sql += `SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));\n`

  // Write to file
  writeFileSync(OUTPUT_FILE, sql, 'utf-8')

  console.log('\n✅ Export complete!')
  console.log(`📄 SQL file saved to: ${OUTPUT_FILE}`)
  console.log('\n📊 Summary:')
  console.log(`   - Runners: ${runners.length}`)
  console.log(`   - Performances: ${performances.length}`)
  console.log(`   - Match candidates: ${candidates.length}`)
  console.log(`   - Teams: ${teams.length}`)
  console.log('\n📝 Next step: Copy the SQL file content and paste it into Supabase SQL Editor')

} catch (error) {
  console.error('❌ Export failed:', error)
  throw error
} finally {
  db.close()
}

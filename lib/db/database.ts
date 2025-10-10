// lib/db/database.ts - SQLite database utilities
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Runner, Performance, MatchStatus, Gender } from '@/types/runner'
import type { DUVSearchResult } from '@/types/match'
import type { Team } from '@/types/team'

const DB_PATH = join(process.cwd(), 'data', 'iau24hwc.db')

// Initialize database with schema
export function initDatabase(): Database.Database {
  console.log('Initializing database at:', DB_PATH)
  const db = new Database(DB_PATH)

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')
  console.log('Database journal mode:', db.pragma('journal_mode', { simple: true }))

  const schema = readFileSync(join(process.cwd(), 'lib/db/schema.sql'), 'utf-8')
  db.exec(schema)

  console.log('Database initialized successfully')
  return db
}

// Singleton database instance
let dbInstance: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initDatabase()
  }
  return dbInstance
}

// Runner CRUD operations
export function insertRunner(runner: Omit<Runner, 'performanceHistory'>): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO runners (
      entry_id, firstname, lastname, nationality, gender,
      duv_id, match_status, match_confidence,
      personal_best_all_time, personal_best_last_2_years,
      date_of_birth, age
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    runner.entryId,
    runner.firstname,
    runner.lastname,
    runner.nationality,
    runner.gender,
    runner.duvId,
    runner.matchStatus,
    runner.matchConfidence,
    runner.personalBestAllTime,
    runner.personalBestLast2Years,
    runner.dateOfBirth,
    runner.age
  )

  return result.lastInsertRowid as number
}

export function updateRunner(entryId: string, updates: Partial<Runner>): void {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []

  if (updates.duvId !== undefined) {
    fields.push('duv_id = ?')
    values.push(updates.duvId)
  }
  if (updates.matchStatus !== undefined) {
    fields.push('match_status = ?')
    values.push(updates.matchStatus)
  }
  if (updates.matchConfidence !== undefined) {
    fields.push('match_confidence = ?')
    values.push(updates.matchConfidence)
  }
  if (updates.personalBestAllTime !== undefined) {
    fields.push('personal_best_all_time = ?')
    values.push(updates.personalBestAllTime)
  }
  if (updates.personalBestLast2Years !== undefined) {
    fields.push('personal_best_last_2_years = ?')
    values.push(updates.personalBestLast2Years)
  }
  if (updates.dateOfBirth !== undefined) {
    fields.push('date_of_birth = ?')
    values.push(updates.dateOfBirth)
  }
  if (updates.age !== undefined) {
    fields.push('age = ?')
    values.push(updates.age)
  }

  if (fields.length === 0) {
    console.log(`updateRunner: No fields to update for entry_id ${entryId}`)
    return
  }

  values.push(entryId)
  const stmt = db.prepare(`
    UPDATE runners SET ${fields.join(', ')} WHERE entry_id = ?
  `)

  console.log(`updateRunner: Executing UPDATE for entry_id ${entryId} with fields:`, fields)
  const result = stmt.run(...values)
  console.log(`updateRunner: Updated ${result.changes} rows`)

  if (result.changes === 0) {
    console.error(`updateRunner: WARNING - No rows updated for entry_id ${entryId}`)
    // Try to find the runner to see if it exists
    const checkStmt = db.prepare('SELECT id, entry_id FROM runners WHERE entry_id = ?')
    const runner = checkStmt.get(entryId)
    console.error(`updateRunner: Runner lookup result:`, runner)
  }
}

export function getRunners(): Runner[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM runners ORDER BY entry_id
  `)

  const rows = stmt.all() as any[]
  return rows.map(rowToRunner)
}

export function getRunnerByEntryId(entryId: string): Runner | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM runners WHERE entry_id = ?')
  const row = stmt.get(entryId) as any

  return row ? rowToRunner(row) : null
}

function rowToRunner(row: any): Runner {
  return {
    id: row.id,
    entryId: row.entry_id,
    firstname: row.firstname,
    lastname: row.lastname,
    nationality: row.nationality,
    gender: row.gender as Gender,
    duvId: row.duv_id,
    matchStatus: row.match_status as MatchStatus,
    matchConfidence: row.match_confidence,
    personalBestAllTime: row.personal_best_all_time,
    personalBestLast2Years: row.personal_best_last_2_years,
    dateOfBirth: row.date_of_birth,
    age: row.age,
  }
}

// Performance operations
export function insertPerformance(runnerId: number, perf: Performance): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO performances (
      runner_id, event_id, event_name, event_date,
      distance, rank, event_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  try {
    const result = stmt.run(
      runnerId,
      perf.eventId,
      perf.eventName,
      perf.date,
      perf.distance,
      perf.rank,
      perf.eventType
    )
    // Detailed logging removed for performance - only log errors
  } catch (error) {
    console.error(`insertPerformance: Failed to insert performance for runner_id ${runnerId}:`, error)
    throw error
  }
}

export function getPerformances(runnerId: number): Performance[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM performances WHERE runner_id = ? ORDER BY event_date DESC
  `)

  const rows = stmt.all(runnerId) as any[]
  return rows.map(row => ({
    eventId: row.event_id,
    eventName: row.event_name,
    date: row.event_date,
    distance: row.distance,
    rank: row.rank,
    eventType: row.event_type,
  }))
}

// Match candidates operations
export function insertMatchCandidates(runnerId: number, candidates: DUVSearchResult[]): void {
  const db = getDatabase()

  // Clear existing candidates
  db.prepare('DELETE FROM match_candidates WHERE runner_id = ?').run(runnerId)

  const stmt = db.prepare(`
    INSERT INTO match_candidates (
      runner_id, duv_person_id, lastname, firstname,
      year_of_birth, nation, sex, personal_best, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const candidate of candidates) {
    stmt.run(
      runnerId,
      candidate.PersonID,
      candidate.Lastname,
      candidate.Firstname,
      candidate.YOB,
      candidate.Nation,
      candidate.Sex,
      candidate.PersonalBest,
      candidate.confidence
    )
  }
}

export function getMatchCandidates(runnerId: number): DUVSearchResult[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM match_candidates WHERE runner_id = ? ORDER BY confidence DESC
  `)

  const rows = stmt.all(runnerId) as any[]
  return rows.map(row => ({
    PersonID: row.duv_person_id,
    Lastname: row.lastname,
    Firstname: row.firstname,
    YOB: row.year_of_birth,
    Nation: row.nation,
    Sex: row.sex,
    PersonalBest: row.personal_best,
    confidence: row.confidence,
  }))
}

// Team operations
export function calculateAndSaveTeams(metric: 'all-time' | 'last-2-years'): void {
  const db = getDatabase()
  const runners = getRunners()

  // Group by nationality + gender
  const teams = new Map<string, Runner[]>()

  runners.forEach(runner => {
    const key = `${runner.nationality}-${runner.gender}`
    if (!teams.has(key)) teams.set(key, [])
    teams.get(key)!.push(runner)
  })

  // Calculate team totals
  const teamData: Team[] = []

  teams.forEach((teamRunners, key) => {
    const [nationality, gender] = key.split('-')

    const sorted = teamRunners.sort((a, b) => {
      const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast2Years
      const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast2Years
      return (bVal || 0) - (aVal || 0)
    })

    const topThree = sorted.slice(0, 3)
    const teamTotal = topThree.reduce((sum, r) => {
      const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast2Years
      return sum + (pb || 0)
    }, 0)

    teamData.push({
      nationality,
      gender: gender as Gender,
      runners: teamRunners,
      topThree,
      teamTotal,
    })
  })

  // Sort by team total and assign ranks
  teamData.sort((a, b) => b.teamTotal - a.teamTotal)

  // Clear existing teams for this metric
  db.prepare('DELETE FROM teams WHERE metric = ?').run(metric)

  // Insert new team rankings
  const stmt = db.prepare(`
    INSERT INTO teams (
      nationality, gender, metric, team_total, rank,
      runner1_id, runner2_id, runner3_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  teamData.forEach((team, index) => {
    // Get runner IDs
    const getIdStmt = db.prepare('SELECT id FROM runners WHERE entry_id = ?')
    const runner1Id = team.topThree[0] ? getIdStmt.get(team.topThree[0].entryId) as any : null
    const runner2Id = team.topThree[1] ? getIdStmt.get(team.topThree[1].entryId) as any : null
    const runner3Id = team.topThree[2] ? getIdStmt.get(team.topThree[2].entryId) as any : null

    stmt.run(
      team.nationality,
      team.gender,
      metric,
      team.teamTotal,
      index + 1,
      runner1Id?.id || null,
      runner2Id?.id || null,
      runner3Id?.id || null
    )
  })
}

export function getTeams(metric: 'all-time' | 'last-2-years', gender: Gender): Team[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM teams
    WHERE metric = ? AND gender = ?
    ORDER BY rank
  `)

  const rows = stmt.all(metric, gender) as any[]

  return rows.map(row => {
    const nationality = row.nationality
    const genderVal = row.gender as Gender

    // Get all runners for this team and sort them by PB (same as calculateAndSaveTeams)
    const runnersStmt = db.prepare(`
      SELECT * FROM runners WHERE nationality = ? AND gender = ?
    `)
    const runnerRows = runnersStmt.all(nationality, genderVal) as any[]
    const runners = runnerRows.map(rowToRunner).sort((a, b) => {
      const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast2Years
      const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast2Years
      return (bVal || 0) - (aVal || 0)
    })

    // Get top 3 runners
    const topThree: Runner[] = []
    if (row.runner1_id) {
      const r1 = db.prepare('SELECT * FROM runners WHERE id = ?').get(row.runner1_id) as any
      if (r1) topThree.push(rowToRunner(r1))
    }
    if (row.runner2_id) {
      const r2 = db.prepare('SELECT * FROM runners WHERE id = ?').get(row.runner2_id) as any
      if (r2) topThree.push(rowToRunner(r2))
    }
    if (row.runner3_id) {
      const r3 = db.prepare('SELECT * FROM runners WHERE id = ?').get(row.runner3_id) as any
      if (r3) topThree.push(rowToRunner(r3))
    }

    return {
      nationality,
      gender: genderVal,
      runners,
      topThree,
      teamTotal: row.team_total,
    }
  })
}

// Utility: Clear all data
export function clearAllData(): void {
  const db = getDatabase()
  db.exec(`
    DELETE FROM match_candidates;
    DELETE FROM performances;
    DELETE FROM teams;
    DELETE FROM runners;
  `)
}

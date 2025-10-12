// lib/db/database.ts - PostgreSQL/Supabase database utilities
import { Pool } from 'pg'
import type { Runner, Performance, MatchStatus, Gender } from '@/types/runner'
import type { DUVSearchResult } from '@/types/match'
import type { Team } from '@/types/team'
import type { NewsItem, NewsItemCreate, NewsItemUpdate } from '@/types/news'
import type { RunnerNote, RunnerNoteCreate, RunnerNoteUpdate } from '@/types/runner-note'

// PostgreSQL connection pool
let pool: Pool | null = null

export function getDatabase(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase
      },
    })

    console.log('PostgreSQL connection pool initialized')
  }

  return pool
}

// Runner CRUD operations
export async function insertRunner(runner: Omit<Runner, 'performanceHistory'>): Promise<number> {
  const db = getDatabase()
  const result = await db.query(`
    INSERT INTO runners (
      entry_id, firstname, lastname, nationality, gender, dns,
      duv_id, match_status, match_confidence,
      personal_best_all_time, personal_best_all_time_year,
      personal_best_last_2_years, personal_best_last_2_years_year,
      date_of_birth, age
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `, [
    runner.entryId,
    runner.firstname,
    runner.lastname,
    runner.nationality,
    runner.gender,
    runner.dns || false,
    runner.duvId,
    runner.matchStatus,
    runner.matchConfidence,
    runner.personalBestAllTime,
    runner.personalBestAllTimeYear,
    runner.personalBestLast3Years,
    runner.personalBestLast3YearsYear,
    runner.dateOfBirth,
    runner.age
  ])

  return result.rows[0].id
}

export async function updateRunner(entryId: string, updates: Partial<Runner>): Promise<void> {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.duvId !== undefined) {
    fields.push(`duv_id = $${paramIndex++}`)
    values.push(updates.duvId)
  }
  if (updates.matchStatus !== undefined) {
    fields.push(`match_status = $${paramIndex++}`)
    values.push(updates.matchStatus)
  }
  if (updates.matchConfidence !== undefined) {
    fields.push(`match_confidence = $${paramIndex++}`)
    values.push(updates.matchConfidence)
  }
  if (updates.personalBestAllTime !== undefined) {
    fields.push(`personal_best_all_time = $${paramIndex++}`)
    values.push(updates.personalBestAllTime)
  }
  if (updates.personalBestAllTimeYear !== undefined) {
    fields.push(`personal_best_all_time_year = $${paramIndex++}`)
    values.push(updates.personalBestAllTimeYear)
  }
  if (updates.personalBestLast3Years !== undefined) {
    fields.push(`personal_best_last_2_years = $${paramIndex++}`)
    values.push(updates.personalBestLast3Years)
  }
  if (updates.personalBestLast3YearsYear !== undefined) {
    fields.push(`personal_best_last_2_years_year = $${paramIndex++}`)
    values.push(updates.personalBestLast3YearsYear)
  }
  if (updates.dateOfBirth !== undefined) {
    fields.push(`date_of_birth = $${paramIndex++}`)
    values.push(updates.dateOfBirth)
  }
  if (updates.age !== undefined) {
    fields.push(`age = $${paramIndex++}`)
    values.push(updates.age)
  }

  if (fields.length === 0) {
    console.log(`updateRunner: No fields to update for entry_id ${entryId}`)
    return
  }

  values.push(entryId)
  const result = await db.query(`
    UPDATE runners SET ${fields.join(', ')} WHERE entry_id = $${paramIndex}
  `, values)

  console.log(`updateRunner: Updated ${result.rowCount} rows`)

  if (result.rowCount === 0) {
    console.error(`updateRunner: WARNING - No rows updated for entry_id ${entryId}`)
  }
}

export async function getRunners(): Promise<Runner[]> {
  const db = getDatabase()

  // Fetch all runners
  const runnersResult = await db.query(`
    SELECT * FROM runners ORDER BY entry_id
  `)

  // Fetch all performances in one query
  const performancesResult = await db.query(`
    SELECT * FROM performances ORDER BY runner_id, event_date DESC
  `)

  // Group performances by runner_id
  const performancesByRunner = new Map<number, any[]>()
  for (const perf of performancesResult.rows) {
    if (!performancesByRunner.has(perf.runner_id)) {
      performancesByRunner.set(perf.runner_id, [])
    }
    performancesByRunner.get(perf.runner_id)!.push({
      eventId: perf.event_id,
      eventName: perf.event_name,
      date: perf.event_date,
      distance: perf.distance,
      rank: perf.rank,
      rankGender: perf.rank_gender,
      eventType: perf.event_type,
    })
  }

  // Fetch note counts for all runners
  const noteCounts = await getRunnerNoteCounts()

  // Build runner objects with performances and note counts
  return runnersResult.rows.map(row => ({
    id: row.id,
    entryId: row.entry_id,
    firstname: row.firstname,
    lastname: row.lastname,
    nationality: row.nationality,
    gender: row.gender as Gender,
    dns: row.dns || false,
    duvId: row.duv_id,
    matchStatus: row.match_status as MatchStatus,
    matchConfidence: row.match_confidence,
    personalBestAllTime: row.personal_best_all_time,
    personalBestAllTimeYear: row.personal_best_all_time_year,
    personalBestLast3Years: row.personal_best_last_2_years,
    personalBestLast3YearsYear: row.personal_best_last_2_years_year,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    allPBs: row.all_pbs || [],
    photoUrl: row.photo_url,
    bio: row.bio,
    instagramUrl: row.instagram_url,
    stravaUrl: row.strava_url,
    performanceHistory: performancesByRunner.get(row.id) || [],
    noteCount: noteCounts.get(row.id) || 0,
  }))
}

export async function getRunnerByEntryId(entryId: string): Promise<Runner | null> {
  const db = getDatabase()
  const result = await db.query('SELECT * FROM runners WHERE entry_id = $1', [entryId])

  return result.rows[0] ? await rowToRunner(result.rows[0]) : null
}

async function rowToRunner(row: any): Promise<Runner> {
  const db = getDatabase()

  // Fetch performances for this runner
  const perfResult = await db.query(
    'SELECT * FROM performances WHERE runner_id = $1 ORDER BY event_date DESC',
    [row.id]
  )

  const performanceHistory = perfResult.rows.map((perf: any) => ({
    eventId: perf.event_id,
    eventName: perf.event_name,
    date: perf.event_date,
    distance: perf.distance,
    rank: perf.rank,
    rankGender: perf.rank_gender,
    eventType: perf.event_type,
  }))

  return {
    id: row.id,
    entryId: row.entry_id,
    firstname: row.firstname,
    lastname: row.lastname,
    nationality: row.nationality,
    gender: row.gender as Gender,
    dns: row.dns || false,
    duvId: row.duv_id,
    matchStatus: row.match_status as MatchStatus,
    matchConfidence: row.match_confidence,
    personalBestAllTime: row.personal_best_all_time,
    personalBestAllTimeYear: row.personal_best_all_time_year,
    personalBestLast3Years: row.personal_best_last_2_years,
    personalBestLast3YearsYear: row.personal_best_last_2_years_year,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    allPBs: row.all_pbs || [],
    photoUrl: row.photo_url,
    bio: row.bio,
    instagramUrl: row.instagram_url,
    stravaUrl: row.strava_url,
    performanceHistory,
  }
}

// Performance operations
export async function insertPerformance(runnerId: number, perf: Performance): Promise<void> {
  const db = getDatabase()

  try {
    await db.query(`
      INSERT INTO performances (
        runner_id, event_id, event_name, event_date,
        distance, rank, rank_gender, event_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      runnerId,
      perf.eventId,
      perf.eventName,
      perf.date,
      perf.distance,
      perf.rank,
      perf.rankGender,
      perf.eventType
    ])
  } catch (error) {
    console.error(`insertPerformance: Failed to insert performance for runner_id ${runnerId}:`, error)
    throw error
  }
}

export async function getPerformances(runnerId: number): Promise<Performance[]> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT * FROM performances WHERE runner_id = $1 ORDER BY event_date DESC
  `, [runnerId])

  return result.rows.map(row => ({
    eventId: row.event_id,
    eventName: row.event_name,
    date: row.event_date,
    distance: row.distance,
    rank: row.rank,
    rankGender: row.rank_gender,
    eventType: row.event_type,
  }))
}

// Match candidates operations
export async function insertMatchCandidates(runnerId: number, candidates: DUVSearchResult[]): Promise<void> {
  const db = getDatabase()

  // Clear existing candidates
  await db.query('DELETE FROM match_candidates WHERE runner_id = $1', [runnerId])

  for (const candidate of candidates) {
    await db.query(`
      INSERT INTO match_candidates (
        runner_id, duv_person_id, lastname, firstname,
        year_of_birth, nation, sex, personal_best, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      runnerId,
      candidate.PersonID,
      candidate.Lastname,
      candidate.Firstname,
      candidate.YOB,
      candidate.Nation,
      candidate.Sex,
      candidate.PersonalBest,
      candidate.confidence
    ])
  }
}

export async function getMatchCandidates(runnerId: number): Promise<DUVSearchResult[]> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT * FROM match_candidates WHERE runner_id = $1 ORDER BY confidence DESC
  `, [runnerId])

  return result.rows.map(row => ({
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
export async function calculateAndSaveTeams(metric: 'all-time' | 'last-3-years'): Promise<void> {
  const db = getDatabase()
  const runners = await getRunners()

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
      const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast3Years
      const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast3Years
      return (bVal || 0) - (aVal || 0)
    })

    const topThree = sorted.slice(0, 3)
    const teamTotal = topThree.reduce((sum, r) => {
      const pb = metric === 'all-time' ? r.personalBestAllTime : r.personalBestLast3Years
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
  await db.query('DELETE FROM teams WHERE metric = $1', [metric])

  // Insert new team rankings
  for (const [index, team] of teamData.entries()) {
    // Get runner IDs
    const runner1Id = team.topThree[0] ? (await db.query('SELECT id FROM runners WHERE entry_id = $1', [team.topThree[0].entryId])).rows[0]?.id : null
    const runner2Id = team.topThree[1] ? (await db.query('SELECT id FROM runners WHERE entry_id = $1', [team.topThree[1].entryId])).rows[0]?.id : null
    const runner3Id = team.topThree[2] ? (await db.query('SELECT id FROM runners WHERE entry_id = $1', [team.topThree[2].entryId])).rows[0]?.id : null

    await db.query(`
      INSERT INTO teams (
        nationality, gender, metric, team_total, rank,
        runner1_id, runner2_id, runner3_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      team.nationality,
      team.gender,
      metric,
      team.teamTotal,
      index + 1,
      runner1Id,
      runner2Id,
      runner3Id
    ])
  }
}

export async function getTeams(metric: 'all-time' | 'last-3-years', gender: Gender): Promise<Team[]> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT * FROM teams
    WHERE metric = $1 AND gender = $2
    ORDER BY rank
  `, [metric, gender])

  const teams: Team[] = []

  for (const row of result.rows) {
    const nationality = row.nationality
    const genderVal = row.gender as Gender

    // Get all runners for this team and sort them by PB
    const runnersResult = await db.query(`
      SELECT * FROM runners WHERE nationality = $1 AND gender = $2
    `, [nationality, genderVal])

    const runners = (await Promise.all(runnersResult.rows.map(row => rowToRunner(row)))).sort((a, b) => {
      const aVal = metric === 'all-time' ? a.personalBestAllTime : a.personalBestLast3Years
      const bVal = metric === 'all-time' ? b.personalBestAllTime : b.personalBestLast3Years
      return (bVal || 0) - (aVal || 0)
    })

    // Get top 3 runners
    const topThree: Runner[] = []
    if (row.runner1_id) {
      const r1Result = await db.query('SELECT * FROM runners WHERE id = $1', [row.runner1_id])
      if (r1Result.rows[0]) topThree.push(await rowToRunner(r1Result.rows[0]))
    }
    if (row.runner2_id) {
      const r2Result = await db.query('SELECT * FROM runners WHERE id = $1', [row.runner2_id])
      if (r2Result.rows[0]) topThree.push(await rowToRunner(r2Result.rows[0]))
    }
    if (row.runner3_id) {
      const r3Result = await db.query('SELECT * FROM runners WHERE id = $1', [row.runner3_id])
      if (r3Result.rows[0]) topThree.push(await rowToRunner(r3Result.rows[0]))
    }

    teams.push({
      nationality,
      gender: genderVal,
      runners,
      topThree,
      teamTotal: row.team_total,
    })
  }

  return teams
}

// Utility: Clear all data
export async function clearAllData(): Promise<void> {
  const db = getDatabase()
  await db.query(`
    DELETE FROM match_candidates;
    DELETE FROM performances;
    DELETE FROM teams;
    DELETE FROM runners;
  `)
}

// News operations
export async function getNews(publishedOnly: boolean = false): Promise<NewsItem[]> {
  const db = getDatabase()
  const query = publishedOnly
    ? 'SELECT * FROM news WHERE published = true ORDER BY created_at DESC'
    : 'SELECT * FROM news ORDER BY created_at DESC'

  const result = await db.query(query)

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function getNewsById(id: number): Promise<NewsItem | null> {
  const db = getDatabase()
  const result = await db.query('SELECT * FROM news WHERE id = $1', [id])

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function createNews(news: NewsItemCreate): Promise<NewsItem> {
  const db = getDatabase()
  const result = await db.query(`
    INSERT INTO news (title, content, published)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [news.title, news.content, news.published || false])

  const row = result.rows[0]
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function updateNews(id: number, updates: NewsItemUpdate): Promise<NewsItem | null> {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`)
    values.push(updates.title)
  }
  if (updates.content !== undefined) {
    fields.push(`content = $${paramIndex++}`)
    values.push(updates.content)
  }
  if (updates.published !== undefined) {
    fields.push(`published = $${paramIndex++}`)
    values.push(updates.published)
  }

  if (fields.length === 0) return await getNewsById(id)

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  const result = await db.query(`
    UPDATE news SET ${fields.join(', ')} WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function deleteNews(id: number): Promise<boolean> {
  const db = getDatabase()
  const result = await db.query('DELETE FROM news WHERE id = $1', [id])
  return result.rowCount !== null && result.rowCount > 0
}

// Runner notes operations
export async function getRunnerNotes(runnerId: number): Promise<RunnerNote[]> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT
      rn.*,
      n.title as news_title,
      n.content as news_content,
      n.published as news_published
    FROM runner_notes rn
    LEFT JOIN news n ON rn.news_id = n.id
    WHERE rn.runner_id = $1
    ORDER BY rn.created_at DESC
  `, [runnerId])

  return result.rows.map(row => ({
    id: row.id,
    runnerId: row.runner_id,
    noteText: row.note_text,
    newsId: row.news_id,
    newsItem: row.news_id ? {
      id: row.news_id,
      title: row.news_title,
      content: row.news_content,
      published: row.news_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function createRunnerNote(note: RunnerNoteCreate): Promise<RunnerNote> {
  const db = getDatabase()
  const result = await db.query(`
    INSERT INTO runner_notes (runner_id, note_text, news_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [note.runnerId, note.noteText || null, note.newsId || null])

  const row = result.rows[0]
  return {
    id: row.id,
    runnerId: row.runner_id,
    noteText: row.note_text,
    newsId: row.news_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function updateRunnerNote(id: number, updates: RunnerNoteUpdate): Promise<RunnerNote | null> {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.noteText !== undefined) {
    fields.push(`note_text = $${paramIndex++}`)
    values.push(updates.noteText || null)
  }
  if (updates.newsId !== undefined) {
    fields.push(`news_id = $${paramIndex++}`)
    values.push(updates.newsId || null)
  }

  if (fields.length === 0) return null

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  const result = await db.query(`
    UPDATE runner_notes SET ${fields.join(', ')} WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    runnerId: row.runner_id,
    noteText: row.note_text,
    newsId: row.news_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteRunnerNote(id: number): Promise<boolean> {
  const db = getDatabase()
  const result = await db.query('DELETE FROM runner_notes WHERE id = $1', [id])
  return result.rowCount !== null && result.rowCount > 0
}

// Get runner notes by news ID (to show which runners are linked to a news item)
export async function getRunnersByNewsId(newsId: number): Promise<number[]> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT DISTINCT runner_id FROM runner_notes WHERE news_id = $1
  `, [newsId])
  return result.rows.map(row => row.runner_id)
}

// Link multiple runners to a news item
export async function linkRunnersToNews(newsId: number, runnerIds: number[]): Promise<void> {
  const db = getDatabase()

  // First, remove existing links for this news item
  await db.query('DELETE FROM runner_notes WHERE news_id = $1 AND note_text IS NULL', [newsId])

  // Create new links
  for (const runnerId of runnerIds) {
    await db.query(`
      INSERT INTO runner_notes (runner_id, news_id)
      VALUES ($1, $2)
    `, [runnerId, newsId])
  }
}

// Get note counts for all runners efficiently
export async function getRunnerNoteCounts(): Promise<Map<number, number>> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT runner_id, COUNT(*) as note_count
    FROM runner_notes
    GROUP BY runner_id
  `)

  const noteCounts = new Map<number, number>()
  for (const row of result.rows) {
    noteCounts.set(row.runner_id, parseInt(row.note_count))
  }
  return noteCounts
}

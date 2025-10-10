// lib/seed/seed-loader.ts
import type { Runner, Gender, MatchStatus } from '@/types/runner'
import seedData from '@/data/seed-data.json'

interface DBRunner {
  id: number
  entry_id: string
  firstname: string
  lastname: string
  nationality: string
  gender: string
  duv_id: number | null
  match_status: string
  match_confidence: number | null
  personal_best_all_time: number | null
  personal_best_last_2_years: number | null
  date_of_birth: string | null
  age: number | null
}

interface SeedData {
  runners: DBRunner[]
  performances: any[]
  matchCandidates: any[]
  teams: any[]
}

/**
 * Transform database row to Runner object
 */
function transformDBRunner(row: any): Runner {
  // Calculate years from performance history if not provided
  let allTimeYear: number | undefined
  let last2YearsYear: number | undefined

  if (row.performanceHistory && Array.isArray(row.performanceHistory)) {
    const performances = row.performanceHistory

    // Find all-time PB year
    if (row.personal_best_all_time && !row.personal_best_all_time_year) {
      const allTimeBestPerf = performances.find((p: any) =>
        Math.abs(p.distance - row.personal_best_all_time) < 0.01
      )
      if (allTimeBestPerf) {
        allTimeYear = new Date(allTimeBestPerf.date).getFullYear()
      }
    }

    // Find last 2 years PB year
    if (row.personal_best_last_2_years && !row.personal_best_last_2_years_year) {
      const threeYearsAgo = new Date()
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

      const recentPerformances = performances.filter((p: any) =>
        new Date(p.date) >= threeYearsAgo
      )

      const last2YearsBestPerf = recentPerformances.find((p: any) =>
        Math.abs(p.distance - row.personal_best_last_2_years) < 0.01
      )
      if (last2YearsBestPerf) {
        last2YearsYear = new Date(last2YearsBestPerf.date).getFullYear()
      }
    }
  }

  return {
    id: row.id,
    entryId: row.entry_id,
    firstname: row.firstname,
    lastname: row.lastname,
    nationality: row.nationality,
    gender: row.gender as Gender,
    duvId: row.duv_id,
    matchStatus: row.match_status as MatchStatus,
    matchConfidence: row.match_confidence ?? undefined,
    personalBestAllTime: row.personal_best_all_time,
    personalBestAllTimeYear: row.personal_best_all_time_year ?? allTimeYear,
    personalBestLast2Years: row.personal_best_last_2_years,
    personalBestLast2YearsYear: row.personal_best_last_2_years_year ?? last2YearsYear,
    dateOfBirth: row.date_of_birth,
    age: row.age ?? undefined,
  }
}

/**
 * Load seed data into localStorage if not already present
 */
export function loadSeedData(): boolean {
  // Check if data already exists
  const existingData = localStorage.getItem('runners')
  if (existingData) {
    console.log('Seed data: Runners already exist in localStorage')
    return false
  }

  try {
    console.log('Seed data: Loading from seed-data.json...')
    const data = seedData as SeedData

    // Transform and save runners
    const runners = data.runners.map(transformDBRunner)
    localStorage.setItem('runners', JSON.stringify(runners))

    console.log(`Seed data: Loaded ${runners.length} runners`)
    console.log(`Seed data stats:`)
    console.log(`  - Total runners: ${runners.length}`)
    console.log(`  - Auto-matched: ${runners.filter(r => r.matchStatus === 'auto-matched').length}`)
    console.log(`  - Manually matched: ${runners.filter(r => r.matchStatus === 'manually-matched').length}`)
    console.log(`  - With performance data: ${runners.filter(r => r.personalBestAllTime !== null).length}`)

    return true
  } catch (error) {
    console.error('Failed to load seed data:', error)
    return false
  }
}

/**
 * Check if seed data is available
 */
export function hasSeedData(): boolean {
  return localStorage.getItem('runners') !== null
}

/**
 * Clear seed data from localStorage
 */
export function clearSeedData(): void {
  localStorage.removeItem('runners')
  console.log('Seed data cleared')
}

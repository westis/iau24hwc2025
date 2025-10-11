// types/runner.ts
export type Gender = 'M' | 'W'
export type MatchStatus = 'unmatched' | 'auto-matched' | 'manually-matched' | 'no-match'

export interface DUVPersonalBest {
  PB: string
  [year: string]: string | {
    Perf: string
    RankIntNat?: string
  }
}

export interface Runner {
  // Database ID
  id: number

  // From PDF entry list
  entryId: string                    // Unique ID (e.g., "1", "2", "3")
  firstname: string
  lastname: string
  nationality: string                // ISO 3166-1 alpha-3 (e.g., "USA", "GER")
  gender: Gender

  // Participation status
  dns?: boolean                      // Did Not Start - true if runner won't participate

  // From DUV matching
  duvId: number | null               // DUV PersonID
  matchStatus: MatchStatus
  matchConfidence?: number           // 0-1 score for auto-matches

  // Performance data (from DUV API)
  personalBestAllTime: number | null           // km
  personalBestAllTimeYear?: number             // Year when all-time PB was set
  personalBestLast3Years: number | null        // km
  personalBestLast3YearsYear?: number          // Year when last-3-years PB was set
  dateOfBirth: string | null                   // ISO date
  age?: number                                 // Calculated
  performanceHistory?: Performance[]
  allPBs?: Array<{                             // All distance PBs (6h, 12h, 24h, 48h, etc.)
    [distance: string]: DUVPersonalBest
  }>

  // Social media links
  stravaUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null

  // Strava data
  stravaAthleteId?: number | null
  stravaPhotoUrl?: string | null
  stravaData?: any | null
  stravaLastFetched?: string | null
}

export interface Performance {
  eventId: number
  eventName: string
  date: string              // ISO date
  distance: number          // km for 24h races
  rank: number
  eventType: string         // "24h", "100km", etc.
}

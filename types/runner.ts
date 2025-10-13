// types/runner.ts
import type { RunnerNote } from './runner-note'

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

  // Profile data
  photoUrl?: string | null                     // Photo URL from Supabase Storage
  photoFocalX?: number                         // Focal point X coordinate (0-100%)
  photoFocalY?: number                         // Focal point Y coordinate (0-100%)
  photoZoom?: number                           // Photo zoom level (1.0-3.0)
  bio?: string | null                          // Runner bio/description
  instagramUrl?: string | null                 // Instagram profile URL
  stravaUrl?: string | null                    // Strava profile URL

  // Notes (both standalone and news-linked)
  notes?: RunnerNote[]
  noteCount?: number  // Count of notes for efficient display in lists
}

export interface Performance {
  eventId: number
  eventName: string
  date: string              // ISO date
  distance: number          // km for 24h races
  rank: number              // Overall ranking
  rankGender?: number       // Gender-specific ranking (M/W)
  eventType: string         // "24h", "100km", etc.
}

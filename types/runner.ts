// types/runner.ts
export type Gender = 'M' | 'W'
export type MatchStatus = 'unmatched' | 'auto-matched' | 'manually-matched' | 'no-match'

export interface Runner {
  // Database ID
  id: number

  // From PDF entry list
  entryId: string                    // Unique ID (e.g., "1", "2", "3")
  firstname: string
  lastname: string
  nationality: string                // ISO 3166-1 alpha-3 (e.g., "USA", "GER")
  gender: Gender

  // From DUV matching
  duvId: number | null               // DUV PersonID
  matchStatus: MatchStatus
  matchConfidence?: number           // 0-1 score for auto-matches

  // Performance data (from DUV API)
  personalBestAllTime: number | null      // km
  personalBestLast2Years: number | null   // km
  dateOfBirth: string | null              // ISO date
  age?: number                            // Calculated
  performanceHistory?: Performance[]
}

export interface Performance {
  eventId: number
  eventName: string
  date: string              // ISO date
  distance: number          // km for 24h races
  rank: number
  eventType: string         // "24h", "100km", etc.
}

// lib/api/types.ts - DUV API Response Types
export interface DUVSearchResponse {
  list: Array<{
    PersonID: number
    Lastname: string
    Firstname: string
    YOB: number
    Nation: string
    Sex: 'M' | 'W'
    PersonalBest: string
  }>
  totalrecords: number
}

// AllPBs structure from DUV API
export interface DUVPersonalBest {
  PB: string                        // Overall PB for this distance
  [year: string]: string | {        // Year-specific performances
    Perf: string
    RankIntNat?: string
  }
}

export interface DUVRunnerProfile {
  PersonID: number
  Lastname: string
  Firstname: string
  YOB: number
  Nation: string
  Sex: 'M' | 'W'
  results: Array<{
    EventID: number
    Event: string
    Startdate: string              // ISO date
    Length: string                 // "24h", "100km"
    Performance: string            // Distance or time
    Rank: number
  }>
  allPBs?: Array<{                  // Pre-calculated PBs from DUV
    [distance: string]: DUVPersonalBest
  }>
}

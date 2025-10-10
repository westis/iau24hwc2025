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
}

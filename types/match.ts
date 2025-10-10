// types/match.ts
import type { Runner } from './runner'

export interface MatchCandidate {
  runner: Runner                     // From entry list
  candidates: DUVSearchResult[]      // From API
  selectedDuvId?: number             // User selection
}

export interface DUVSearchResult {
  PersonID: number
  Lastname: string
  Firstname: string
  YOB: number
  Nation: string
  Sex: 'M' | 'W'
  PersonalBest: string               // "245.123" (km as string)
  confidence: number                 // Calculated match score
}

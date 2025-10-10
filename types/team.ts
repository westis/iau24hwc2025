// types/team.ts
import type { Gender, Runner } from './runner'

export interface Team {
  nationality: string
  gender: Gender
  runners: Runner[]                  // All runners from this country/gender
  topThree: Runner[]                 // Top 3 by selected PB metric
  teamTotal: number                  // Sum of top 3 PBs
}

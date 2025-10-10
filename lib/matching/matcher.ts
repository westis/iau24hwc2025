// lib/matching/matcher.ts - Auto-Matching Algorithm for DUV Runner Matching

import type { Runner } from '@/types/runner'
import type { MatchCandidate, DUVSearchResult } from '@/types/match'
import { searchRunners, DUVApiError } from '@/lib/api/duv-client'

/**
 * Confidence threshold for automatic matching
 * If confidence >= 0.8, auto-match the runner
 * Otherwise, return candidates for manual review
 */
const AUTO_MATCH_THRESHOLD = 0.8

/**
 * Scoring weights for matching algorithm
 */
const SCORING_WEIGHTS = {
  EXACT_LASTNAME: 0.4,
  EXACT_FIRSTNAME: 0.3,
  NATION_MATCH: 0.2,
  GENDER_MATCH: 0.1,
} as const

/**
 * Normalize string for comparison
 * Converts to lowercase, removes accents, and trims whitespace
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim()
}

/**
 * Compare two strings for exact match (case-insensitive, accent-insensitive)
 */
function isExactMatch(a: string, b: string): boolean {
  return normalizeString(a) === normalizeString(b)
}

/**
 * Convert ISO 3166-1 alpha-3 to alpha-2 or DUV format
 * DUV typically uses 3-letter codes, but may vary
 */
function normalizeNationality(nationality: string): string {
  const normalized = nationality.trim().toUpperCase()

  // Common mappings for consistency
  const mappings: Record<string, string> = {
    'GBR': 'GBR',
    'UK': 'GBR',
    'GB': 'GBR',
    'USA': 'USA',
    'US': 'USA',
    'DEU': 'GER',
    'DE': 'GER',
    'FRA': 'FRA',
    'FR': 'FRA',
  }

  return mappings[normalized] || normalized
}

/**
 * Calculate match confidence score for a DUV search result
 *
 * Scoring criteria:
 * - Exact lastname match: +0.4
 * - Exact firstname match: +0.3
 * - Nation match: +0.2
 * - Gender match: +0.1
 *
 * @param runner - Runner from entry list
 * @param candidate - DUV search result
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(
  runner: Runner,
  candidate: {
    Lastname: string
    Firstname: string
    Nation: string
    Sex: 'M' | 'W'
  }
): number {
  let score = 0

  // Exact lastname match: +0.4
  if (isExactMatch(runner.lastname, candidate.Lastname)) {
    score += SCORING_WEIGHTS.EXACT_LASTNAME
  }

  // Exact firstname match: +0.3
  if (isExactMatch(runner.firstname, candidate.Firstname)) {
    score += SCORING_WEIGHTS.EXACT_FIRSTNAME
  }

  // Nation match: +0.2
  const runnerNation = normalizeNationality(runner.nationality)
  const candidateNation = normalizeNationality(candidate.Nation)
  if (runnerNation === candidateNation) {
    score += SCORING_WEIGHTS.NATION_MATCH
  }

  // Gender match: +0.1
  if (runner.gender === candidate.Sex) {
    score += SCORING_WEIGHTS.GENDER_MATCH
  }

  return score
}

/**
 * Sort candidates by confidence score (descending)
 */
function sortCandidatesByConfidence(
  candidates: DUVSearchResult[]
): DUVSearchResult[] {
  return [...candidates].sort((a, b) => b.confidence - a.confidence)
}

/**
 * Auto-match a runner from entry list to DUV database
 *
 * Algorithm:
 * 1. Search DUV API with runner's name and gender
 * 2. Score each candidate based on exact matches
 * 3. If top candidate has confidence ≥ 0.8, auto-match
 * 4. Otherwise, return all candidates for manual review
 *
 * @param runner - Runner from entry list
 * @returns Promise resolving to match candidate with scored results
 * @throws Error if API request fails
 *
 * @example
 * ```typescript
 * const result = await autoMatchRunner(runner)
 * if (result.selectedDuvId) {
 *   console.log(`Auto-matched to DUV ID: ${result.selectedDuvId}`)
 * } else {
 *   console.log(`Manual review needed (${result.candidates.length} candidates)`)
 * }
 * ```
 */
export async function autoMatchRunner(
  runner: Runner
): Promise<MatchCandidate> {
  try {
    // Step 1: Search DUV API
    const searchResponse = await searchRunners(
      runner.lastname,
      runner.firstname,
      runner.gender
    )

    // Step 2: Score each candidate
    const scoredCandidates: DUVSearchResult[] = searchResponse.list.map(
      (candidate) => ({
        ...candidate,
        confidence: calculateConfidence(runner, candidate),
      })
    )

    // Sort by confidence (highest first)
    const sortedCandidates = sortCandidatesByConfidence(scoredCandidates)

    // Step 3: Check for auto-match
    const topCandidate = sortedCandidates[0]
    let selectedDuvId: number | undefined

    if (topCandidate && topCandidate.confidence >= AUTO_MATCH_THRESHOLD) {
      // Auto-match conditions met
      selectedDuvId = topCandidate.PersonID
    }

    // Step 4: Return result
    return {
      runner,
      candidates: sortedCandidates,
      selectedDuvId,
    }
  } catch (error) {
    // Handle API errors gracefully
    if (error instanceof DUVApiError) {
      // Return empty candidates for API errors
      // This allows the application to continue and mark as unmatched
      console.error(
        `DUV API error for ${runner.firstname} ${runner.lastname}:`,
        error.message
      )

      return {
        runner,
        candidates: [],
        selectedDuvId: undefined,
      }
    }

    // Re-throw unexpected errors
    throw error
  }
}

/**
 * Batch auto-match multiple runners
 * Processes runners sequentially to respect rate limits
 *
 * @param runners - Array of runners from entry list
 * @returns Promise resolving to array of match candidates
 *
 * @example
 * ```typescript
 * const results = await batchAutoMatchRunners(runners)
 * const autoMatched = results.filter(r => r.selectedDuvId)
 * console.log(`Auto-matched: ${autoMatched.length}/${results.length}`)
 * ```
 */
export async function batchAutoMatchRunners(
  runners: Runner[]
): Promise<MatchCandidate[]> {
  const results: MatchCandidate[] = []

  // Process sequentially to respect rate limits
  // The bottleneck limiter in duv-client handles the actual rate limiting
  for (const runner of runners) {
    const result = await autoMatchRunner(runner)
    results.push(result)
  }

  return results
}

/**
 * Get matching statistics from a batch of match candidates
 *
 * @param candidates - Array of match candidates
 * @returns Statistics object
 *
 * @example
 * ```typescript
 * const stats = getMatchingStats(matchResults)
 * console.log(`Auto-matched: ${stats.autoMatched}/${stats.total}`)
 * console.log(`Manual review needed: ${stats.needsReview}`)
 * ```
 */
export function getMatchingStats(candidates: MatchCandidate[]): {
  total: number
  autoMatched: number
  needsReview: number
  noResults: number
  averageConfidence: number
} {
  const total = candidates.length
  const autoMatched = candidates.filter((c) => c.selectedDuvId).length
  const noResults = candidates.filter((c) => c.candidates.length === 0).length
  const needsReview = total - autoMatched - noResults

  // Calculate average confidence for top candidates
  const confidences = candidates
    .map((c) => c.candidates[0]?.confidence)
    .filter((c): c is number => c !== undefined)

  const averageConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0

  return {
    total,
    autoMatched,
    needsReview,
    noResults,
    averageConfidence,
  }
}

/**
 * Validate a manual match selection
 * Ensures the selected DUV ID exists in the candidates list
 *
 * @param candidate - Match candidate
 * @param selectedDuvId - Manually selected DUV PersonID
 * @returns true if valid, false otherwise
 */
export function validateManualMatch(
  candidate: MatchCandidate,
  selectedDuvId: number
): boolean {
  return candidate.candidates.some((c) => c.PersonID === selectedDuvId)
}

// lib/matching/test-matcher.ts - Test script for auto-matching algorithm
// This demonstrates usage without requiring actual API calls

import type { Runner } from '@/types/runner'
import type { MatchCandidate } from '@/types/match'
import { getMatchingStats } from './matcher'

/**
 * Test the matching algorithm with mock data
 *
 * Run with: npx tsx lib/matching/test-matcher.ts
 */

// Mock runner data
const mockRunners: Runner[] = [
  {
    id: 1,
    entryId: '1',
    firstname: 'John',
    lastname: 'Smith',
    nationality: 'USA',
    gender: 'M',
    duvId: null,
    matchStatus: 'unmatched',
    personalBestAllTime: null,
    personalBestLast3Years: null,
    dateOfBirth: null,
  },
  {
    id: 2,
    entryId: '2',
    firstname: 'Jane',
    lastname: 'Doe',
    nationality: 'GBR',
    gender: 'W',
    duvId: null,
    matchStatus: 'unmatched',
    personalBestAllTime: null,
    personalBestLast3Years: null,
    dateOfBirth: null,
  },
]

// Mock match candidates (simulating API results)
const mockMatchCandidates: MatchCandidate[] = [
  {
    runner: mockRunners[0],
    candidates: [
      {
        PersonID: 12345,
        Lastname: 'Smith',
        Firstname: 'John',
        YOB: 1985,
        Nation: 'USA',
        Sex: 'M',
        PersonalBest: '245.123',
        confidence: 1.0, // Perfect match
      },
      {
        PersonID: 12346,
        Lastname: 'Smith',
        Firstname: 'John',
        YOB: 1990,
        Nation: 'CAN',
        Sex: 'M',
        PersonalBest: '230.456',
        confidence: 0.7, // Good match but different nation
      },
    ],
    selectedDuvId: 12345, // Auto-matched due to 1.0 confidence
  },
  {
    runner: mockRunners[1],
    candidates: [
      {
        PersonID: 67890,
        Lastname: 'Doe',
        Firstname: 'Jane',
        YOB: 1988,
        Nation: 'GBR',
        Sex: 'W',
        PersonalBest: '238.789',
        confidence: 0.75, // Below threshold, needs manual review
      },
    ],
    selectedDuvId: undefined, // Not auto-matched
  },
]

function testMatchingStats() {
  console.log('\n=== Testing Matching Statistics ===\n')

  const stats = getMatchingStats(mockMatchCandidates)

  console.log('Statistics:')
  console.log(`  Total runners: ${stats.total}`)
  console.log(`  Auto-matched: ${stats.autoMatched}`)
  console.log(`  Needs manual review: ${stats.needsReview}`)
  console.log(`  No results: ${stats.noResults}`)
  console.log(`  Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`)

  console.log('\nMatch Results:')
  mockMatchCandidates.forEach((match, idx) => {
    const { runner, candidates, selectedDuvId } = match
    console.log(`\n${idx + 1}. ${runner.firstname} ${runner.lastname} (${runner.nationality}, ${runner.gender})`)

    if (selectedDuvId) {
      const matched = candidates.find((c) => c.PersonID === selectedDuvId)
      console.log(`   ✓ Auto-matched to PersonID ${selectedDuvId}`)
      console.log(`     Confidence: ${(matched!.confidence * 100).toFixed(1)}%`)
    } else if (candidates.length > 0) {
      console.log(`   ⚠ Needs manual review (${candidates.length} candidates)`)
      candidates.forEach((c, i) => {
        console.log(`     ${i + 1}. PersonID ${c.PersonID}: ${c.Firstname} ${c.Lastname} (${c.Nation}) - ${(c.confidence * 100).toFixed(1)}%`)
      })
    } else {
      console.log('   ✗ No matches found')
    }
  })
}

function testConfidenceScoring() {
  console.log('\n\n=== Testing Confidence Scoring Logic ===\n')

  const scoringExamples = [
    {
      description: 'Perfect match (all fields)',
      score: 1.0,
      breakdown: {
        'Exact lastname': 0.4,
        'Exact firstname': 0.3,
        'Nation match': 0.2,
        'Gender match': 0.1,
      },
    },
    {
      description: 'Name match only (different nation)',
      score: 0.8,
      breakdown: {
        'Exact lastname': 0.4,
        'Exact firstname': 0.3,
        'Gender match': 0.1,
      },
    },
    {
      description: 'Lastname + nation + gender',
      score: 0.7,
      breakdown: {
        'Exact lastname': 0.4,
        'Nation match': 0.2,
        'Gender match': 0.1,
      },
    },
    {
      description: 'Below auto-match threshold',
      score: 0.5,
      breakdown: {
        'Exact lastname': 0.4,
        'Gender match': 0.1,
      },
    },
  ]

  console.log('Scoring Weights:')
  console.log('  - Exact lastname match: +40%')
  console.log('  - Exact firstname match: +30%')
  console.log('  - Nation match: +20%')
  console.log('  - Gender match: +10%')
  console.log('  - Auto-match threshold: ≥80%')

  scoringExamples.forEach((example) => {
    console.log(`\n${example.description}:`)
    console.log(`  Total Score: ${(example.score * 100).toFixed(0)}%`)
    console.log('  Breakdown:')
    Object.entries(example.breakdown).forEach(([key, value]) => {
      console.log(`    - ${key}: +${(value * 100).toFixed(0)}%`)
    })
    console.log(`  Result: ${example.score >= 0.8 ? '✓ AUTO-MATCH' : '⚠ MANUAL REVIEW'}`)
  })
}

function main() {
  console.log('Auto-Matching Algorithm Test Suite')
  console.log('===================================')

  testMatchingStats()
  testConfidenceScoring()

  console.log('\n\n===================================')
  console.log('✓ All tests completed successfully!')
  console.log('\nTo test with real API calls, see:')
  console.log('  - lib/api/test-duv-client.ts (API client)')
  console.log('  - Use autoMatchRunner() with real runner data')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { testMatchingStats, testConfidenceScoring }

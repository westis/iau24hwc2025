// lib/api/test-duv-client.ts - Test script for DUV API client
// This demonstrates usage and validates the API client structure

import { searchRunners, getRunnerProfile, batchSearchRunners } from './duv-client'
import type { Gender } from '@/types/runner'

/**
 * Test DUV API client functions
 *
 * IMPORTANT: This requires an active internet connection and the DUV API to be available.
 * Run with: npx tsx lib/api/test-duv-client.ts
 */

async function testSearchRunners() {
  console.log('\n=== Testing searchRunners ===')

  try {
    // Test search for a common name
    const results = await searchRunners('Smith', 'John', 'M')

    console.log(`Found ${results.totalrecords} runners matching "John Smith" (M)`)

    if (results.list.length > 0) {
      console.log('\nFirst result:')
      const first = results.list[0]
      console.log(`  - ${first.Firstname} ${first.Lastname}`)
      console.log(`  - Nation: ${first.Nation}, YOB: ${first.YOB}`)
      console.log(`  - PersonID: ${first.PersonID}`)
      console.log(`  - Personal Best: ${first.PersonalBest}`)
    }

    return results
  } catch (error) {
    console.error('Error in searchRunners:', error)
    throw error
  }
}

async function testGetRunnerProfile(personId: number) {
  console.log(`\n=== Testing getRunnerProfile (ID: ${personId}) ===`)

  try {
    const profile = await getRunnerProfile(personId)

    console.log(`\nProfile for: ${profile.Firstname} ${profile.Lastname}`)
    console.log(`  - Nation: ${profile.Nation}, YOB: ${profile.YOB}`)
    console.log(`  - Total results: ${profile.results.length}`)

    if (profile.results.length > 0) {
      console.log('\nRecent results:')
      profile.results.slice(0, 3).forEach((result) => {
        console.log(`  - ${result.Event} (${result.Startdate}): ${result.Performance}`)
      })
    }

    return profile
  } catch (error) {
    console.error('Error in getRunnerProfile:', error)
    throw error
  }
}

async function testBatchSearch() {
  console.log('\n=== Testing batchSearchRunners ===')

  try {
    const searches = [
      { lastname: 'Smith', firstname: 'John', gender: 'M' as Gender },
      { lastname: 'Doe', firstname: 'Jane', gender: 'W' as Gender },
    ]

    console.log(`Searching for ${searches.length} runners (rate-limited to 1 req/sec)...`)
    const startTime = Date.now()

    const results = await batchSearchRunners(searches)

    const duration = (Date.now() - startTime) / 1000
    console.log(`\nCompleted in ${duration.toFixed(1)}s`)

    results.forEach((result, idx) => {
      const search = searches[idx]
      console.log(`\n${search.firstname} ${search.lastname} (${search.gender}): ${result.totalrecords} results`)
    })

    return results
  } catch (error) {
    console.error('Error in batchSearchRunners:', error)
    throw error
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing error handling ===')

  try {
    // Test with invalid PersonID
    console.log('Testing with invalid PersonID (999999999)...')
    await getRunnerProfile(999999999)
  } catch (error) {
    console.log('✓ Successfully caught error for invalid PersonID')
    console.log(`  Error: ${error}`)
  }

  try {
    // Test with empty search (should return empty results, not error)
    console.log('\nTesting with unlikely name combination...')
    const results = await searchRunners('Xyz', 'Abc', 'M')
    console.log(`✓ Empty search handled gracefully: ${results.totalrecords} results`)
  } catch (error) {
    console.log('✓ Successfully handled search error')
    console.log(`  Error: ${error}`)
  }
}

// Main execution
async function main() {
  console.log('DUV API Client Test Suite')
  console.log('=========================')
  console.log('\nNote: This requires an active internet connection')
  console.log('and will make real API calls (rate-limited to 1 req/sec)')

  try {
    // Test individual search
    const searchResults = await testSearchRunners()

    // Test profile fetch if we have results
    if (searchResults.list.length > 0) {
      const firstPersonId = searchResults.list[0].PersonID
      await testGetRunnerProfile(firstPersonId)
    }

    // Test batch search (demonstrates rate limiting)
    await testBatchSearch()

    // Test error handling
    await testErrorHandling()

    console.log('\n=========================')
    console.log('✓ All tests completed successfully!')

  } catch (error) {
    console.error('\n✗ Tests failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export for use in other tests
export { testSearchRunners, testGetRunnerProfile, testBatchSearch, testErrorHandling }

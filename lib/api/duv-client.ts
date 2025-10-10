// lib/api/duv-client.ts - DUV API Client with Rate Limiting

import Bottleneck from 'bottleneck'
import type { Gender } from '@/types/runner'
import type { DUVSearchResponse, DUVRunnerProfile } from './types'

/**
 * Rate limiter for DUV API requests
 * Limits to 1 request per second to respect API rate limits
 */
const limiter = new Bottleneck({
  minTime: 1000, // 1 request per second
  maxConcurrent: 1, // One request at a time
})

/**
 * Base URLs for DUV API
 * - REST API: Incomplete, doesn't have all runners
 * - JSON API: More complete, used by web interface
 */
const DUV_REST_API_BASE = 'https://statistik.d-u-v.org/api'
const DUV_JSON_API_BASE = 'https://statistik.d-u-v.org/json'

/**
 * Custom error class for DUV API errors
 */
export class DUVApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message)
    this.name = 'DUVApiError'
  }
}

/**
 * Search for runners in the DUV database
 *
 * @param lastname - Runner's last name
 * @param firstname - Runner's first name
 * @param gender - Runner's gender ('M' or 'W')
 * @returns Promise resolving to search results
 * @throws DUVApiError if the request fails
 *
 * @example
 * ```typescript
 * const results = await searchRunners('Smith', 'John', 'M')
 * console.log(`Found ${results.totalrecords} runners`)
 * ```
 */
export const searchRunners = limiter.wrap(
  async (
    lastname: string,
    firstname: string,
    gender: Gender
  ): Promise<DUVSearchResponse> => {
    const endpoint = `${DUV_REST_API_BASE}/search`

    // Convert gender to DUV format (M/W)
    const sex = gender === 'M' ? 'M' : 'W'

    // Build query parameters
    const params = new URLSearchParams({
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      sex,
    })

    const url = `${endpoint}?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IAU-24h-Analytics/1.0',
        },
      })

      if (!response.ok) {
        throw new DUVApiError(
          `DUV API search failed: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        )
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new DUVApiError(
          'Invalid response format from DUV API',
          undefined,
          endpoint
        )
      }

      // Ensure list exists
      if (!Array.isArray(data.list)) {
        data.list = []
      }

      // Ensure totalrecords exists
      if (typeof data.totalrecords !== 'number') {
        data.totalrecords = data.list.length
      }

      return data as DUVSearchResponse
    } catch (error) {
      if (error instanceof DUVApiError) {
        throw error
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new DUVApiError(
          `Network error while searching DUV API: ${error.message}`,
          undefined,
          endpoint
        )
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new DUVApiError(
          `Invalid JSON response from DUV API: ${error.message}`,
          undefined,
          endpoint
        )
      }

      // Unknown error
      throw new DUVApiError(
        `Unexpected error searching DUV API: ${error}`,
        undefined,
        endpoint
      )
    }
  }
)

/**
 * Get detailed profile for a specific runner
 *
 * @param personId - DUV PersonID
 * @returns Promise resolving to runner profile with performance history
 * @throws DUVApiError if the request fails
 *
 * @example
 * ```typescript
 * const profile = await getRunnerProfile(12345)
 * console.log(`${profile.Firstname} ${profile.Lastname}`)
 * console.log(`Results: ${profile.results.length}`)
 * ```
 */
export const getRunnerProfile = limiter.wrap(
  async (personId: number): Promise<DUVRunnerProfile> => {
    // Use JSON endpoint instead of REST API - it has more complete data
    const endpoint = `${DUV_JSON_API_BASE}/mgetresultperson.php?runner=${personId}&plain=1`

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IAU-24h-Analytics/1.0',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new DUVApiError(
            `Runner not found: PersonID ${personId}`,
            404,
            endpoint
          )
        }

        throw new DUVApiError(
          `DUV API profile request failed: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        )
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new DUVApiError(
          'Invalid response format from DUV API',
          undefined,
          endpoint
        )
      }

      // Parse the JSON endpoint response structure
      const personHeader = data.PersonHeader || {}
      const allPerfs = data.AllPerfs || []
      const allPBs = data.AllPBs || []

      // Extract basic runner info
      const yobStr = personHeader.YOB
      let yob = 0
      if (yobStr && yobStr !== '0000' && yobStr !== '&nbsp;') {
        try {
          yob = parseInt(yobStr, 10)
        } catch {
          yob = 0
        }
      }

      // Extract all performances
      const results: Array<{
        EventID: number
        Event: string
        Startdate: string
        Length: string
        Performance: string
        Rank: number
      }> = []

      for (const yearData of allPerfs) {
        const perfsPerYear = yearData.PerfsPerYear || []
        for (const perf of perfsPerYear) {
          const evtDist = perf.EvtDist || ''
          const perfText = perf.Perf || ''

          if (!evtDist || !perfText) continue

          // Parse event date (format: "26.-27.04.2025" or "27.04.2025")
          const evtDate = perf.EvtDate || ''
          let eventDate = ''

          // Try two-day format first: "26.-27.04.2025"
          let dateMatch = evtDate.match(/(\d{1,2})\.[-\s]*(\d{1,2})\.(\d{1,2})\.(\d{4})/)
          if (dateMatch) {
            const day = dateMatch[2].padStart(2, '0')
            const month = dateMatch[3].padStart(2, '0')
            const year = dateMatch[4]
            eventDate = `${year}-${month}-${day}`
          } else {
            // Try single date format: "27.04.2025"
            dateMatch = evtDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0')
              const month = dateMatch[2].padStart(2, '0')
              const year = dateMatch[3]
              eventDate = `${year}-${month}-${day}`
            } else {
              eventDate = evtDate
            }
          }

          results.push({
            EventID: perf.EvtID || 0,
            Event: perf.EvtName || '',
            Startdate: eventDate,
            Length: evtDist.trim(),
            Performance: perfText,
            Rank: perf.RankOverall || 0,
          })
        }
      }

      // Return normalized profile structure
      return {
        PersonID: personId,
        Lastname: personHeader.Lastname || '',
        Firstname: personHeader.Firstname || '',
        YOB: yob,
        Nation: personHeader.Nation || '',
        Sex: personHeader.Sex || 'M',
        results,
        allPBs,
      } as DUVRunnerProfile
    } catch (error) {
      if (error instanceof DUVApiError) {
        throw error
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new DUVApiError(
          `Network error while fetching runner profile: ${error.message}`,
          undefined,
          endpoint
        )
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new DUVApiError(
          `Invalid JSON response from DUV API: ${error.message}`,
          undefined,
          endpoint
        )
      }

      // Unknown error
      throw new DUVApiError(
        `Unexpected error fetching runner profile: ${error}`,
        undefined,
        endpoint
      )
    }
  }
)

/**
 * Batch search for multiple runners
 * Automatically rate-limited by the limiter
 *
 * @param runners - Array of runner search criteria
 * @returns Promise resolving to array of search results
 *
 * @example
 * ```typescript
 * const results = await batchSearchRunners([
 *   { lastname: 'Smith', firstname: 'John', gender: 'M' },
 *   { lastname: 'Doe', firstname: 'Jane', gender: 'W' },
 * ])
 * ```
 */
export async function batchSearchRunners(
  runners: Array<{
    lastname: string
    firstname: string
    gender: Gender
  }>
): Promise<Array<DUVSearchResponse>> {
  return Promise.all(
    runners.map(({ lastname, firstname, gender }) =>
      searchRunners(lastname, firstname, gender)
    )
  )
}

/**
 * Batch fetch runner profiles
 * Automatically rate-limited by the limiter
 *
 * @param personIds - Array of DUV PersonIDs
 * @returns Promise resolving to array of runner profiles
 *
 * @example
 * ```typescript
 * const profiles = await batchGetRunnerProfiles([12345, 67890])
 * ```
 */
export async function batchGetRunnerProfiles(
  personIds: number[]
): Promise<Array<DUVRunnerProfile>> {
  return Promise.all(personIds.map((id) => getRunnerProfile(id)))
}

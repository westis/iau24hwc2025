'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Check, X, Database, Loader2, ChevronDown } from 'lucide-react'

interface MatchCandidate {
  id: number
  duv_person_id: number
  lastname: string
  firstname: string
  year_of_birth: number | null
  nation: string
  sex: string
  personal_best: string
  confidence: number
}

interface Runner {
  id: number
  entry_id: string
  firstname: string
  lastname: string
  nationality: string
  gender: string
  match_status: string
  candidates: MatchCandidate[]
}

interface DUVResult {
  PersonID: string
  LastName: string
  FirstName: string
  YOB: string
  Nationality: string
  Gender: string
  City?: string
  Club?: string
  ActivRange?: string
}

export default function MatchPage() {
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null)
  const [searchResults, setSearchResults] = useState<DUVResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [manualSearchInput, setManualSearchInput] = useState('')
  const [isManualSearch, setIsManualSearch] = useState(false)
  const [isFetchingPBs, setIsFetchingPBs] = useState(false)
  const [fetchMessage, setFetchMessage] = useState<string | null>(null)
  const [showFetchOptions, setShowFetchOptions] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number } | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  useEffect(() => {
    loadUnmatchedRunners()
  }, [])

  async function loadUnmatchedRunners() {
    try {
      // Load from localStorage
      const stored = localStorage.getItem('runners')
      if (!stored) {
        setError('No runners found in storage')
        setLoading(false)
        return
      }

      const allRunners = JSON.parse(stored)

      // Filter for unmatched runners (no DUV ID and not marked as no-match)
      const unmatched = allRunners.filter((r: any) =>
        !r.duvId && r.matchStatus !== 'no-match'
      ).map((r: any) => ({
        id: r.id,
        entry_id: r.entryId,
        firstname: r.firstname,
        lastname: r.lastname,
        nationality: r.nationality,
        gender: r.gender,
        match_status: r.matchStatus,
        candidates: [] // No pre-stored candidates in localStorage mode
      }))

      setRunners(unmatched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runners')
    } finally {
      setLoading(false)
    }
  }

  async function searchDUV(runner: Runner) {
    setSearching(true)
    setSearchQuery(`${runner.firstname} ${runner.lastname}`)
    setIsManualSearch(false) // This is an automatic search
    try {
      const params = new URLSearchParams({
        lastname: runner.lastname,
        firstname: runner.firstname,
        gender: runner.gender,
        nationality: runner.nationality
      })
      const response = await fetch(`/api/duv/search?${params}`)
      if (!response.ok) throw new Error('DUV search failed')
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (err) {
      console.error('DUV search error:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function manualSearch() {
    if (!manualSearchInput.trim()) return

    setSearching(true)
    setSearchQuery(manualSearchInput)
    setIsManualSearch(true) // This is a manual search
    // Keep selectedRunner so we can match results to it

    try {
      // Parse the input intelligently for compound surnames
      const input = manualSearchInput.trim()
      const parts = input.split(/\s+/)

      // Common surname prefixes that indicate compound surnames
      const surnamePrefixes = ['de', 'van', 'von', 'le', 'la', 'del', 'della', 'di', 'da', 'dos', 'das', 'mc', 'mac', 'o']

      let lastname = ''
      let firstname = ''

      if (parts.length === 1) {
        // Single word - treat as lastname
        lastname = parts[0]
      } else if (parts.length === 2 && surnamePrefixes.includes(parts[0].toLowerCase())) {
        // Two words starting with surname prefix (e.g., "De Souza") - treat whole thing as lastname
        lastname = input
      } else if (parts.length >= 2) {
        // Multiple words - check if any middle word is a surname prefix
        let lastnameStartIndex = -1
        for (let i = 0; i < parts.length - 1; i++) {
          if (surnamePrefixes.includes(parts[i].toLowerCase())) {
            lastnameStartIndex = i
            break
          }
        }

        if (lastnameStartIndex >= 0) {
          // Found a prefix - everything from there is lastname
          firstname = parts.slice(0, lastnameStartIndex).join(' ')
          lastname = parts.slice(lastnameStartIndex).join(' ')
        } else {
          // No prefix found - assume last word is lastname, rest is firstname
          lastname = parts[parts.length - 1]
          firstname = parts.slice(0, -1).join(' ')
        }
      }

      const params = new URLSearchParams({
        lastname,
        firstname,
      })
      const response = await fetch(`/api/duv/search?${params}`)
      if (!response.ok) throw new Error('DUV search failed')
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (err) {
      console.error('DUV search error:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function selectMatch(runnerId: number, duvId: number) {
    try {
      console.log(`\n${'*'.repeat(60)}`)
      console.log(`MANUAL MATCH ATTEMPT`)
      console.log(`Runner ID: ${runnerId}`)
      console.log(`DUV Person ID: ${duvId}`)
      console.log(`Type of DUV ID: ${typeof duvId}`)
      console.log(`DUV ID value: ${JSON.stringify(duvId)}`)
      console.log(`${'*'.repeat(60)}\n`)

      const response = await fetch(`/api/runners/${runnerId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duvId, confidence: 1.0 })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Match API error:', errorData)

        // Show user-friendly error message
        if (errorData.error && errorData.error.includes('Invalid DUV PersonID')) {
          alert(`⚠️ INVALID MATCH\n\n${errorData.error}\n\nThis PersonID does not exist in the DUV database. Please try a different match candidate.`)
        } else {
          alert(errorData.error || 'Failed to create match')
        }
        throw new Error(errorData.error || 'Failed to create match')
      }

      const result = await response.json()
      console.log('Match successful:', result)

      // Verify the duv_id was saved
      if (result.runner && result.runner.duv_id) {
        console.log(`✓ DUV ID ${result.runner.duv_id} successfully saved for runner ID ${runnerId}`)
      } else {
        console.error(`✗ WARNING: DUV ID was not saved! Response:`, result)
        alert('WARNING: Match may not have been saved correctly. Check console.')
      }

      // Remove from list and close panel
      setRunners(runners.filter(r => r.id !== runnerId))
      setSelectedRunner(null)
      setSearchResults([])
      loadUnmatchedRunners() // Reload to get updated count
    } catch (err) {
      console.error('Match error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create match')
    }
  }

  async function markAsNoMatch(runnerId: number) {
    if (!confirm('Mark this runner as "No Match" (not found in DUV database)?')) {
      return
    }

    try {
      console.log(`Marking runner ID ${runnerId} as no-match`)

      const response = await fetch(`/api/runners/${runnerId}/no-match`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('No-match API error:', errorData)
        throw new Error(errorData.error || 'Failed to mark as no-match')
      }

      const result = await response.json()
      console.log('Marked as no-match:', result)

      // Remove from list and close panel
      setRunners(runners.filter(r => r.id !== runnerId))
      setSelectedRunner(null)
      setSearchResults([])
      loadUnmatchedRunners() // Reload to get updated count
    } catch (err) {
      console.error('No-match error:', err)
      alert(err instanceof Error ? err.message : 'Failed to mark as no-match')
    }
  }

  async function unmatchAllWithoutDuvId() {
    if (!confirm('This will unmatch all runners that have a match status but no DUV ID. Are you sure?')) {
      return
    }

    try {
      const response = await fetch('/api/runners/unmatch-missing-duv', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to unmatch runners')
      }

      const data = await response.json()
      alert(`Successfully unmatched ${data.count} runners without DUV ID. Reload the page to see them.`)

      // Reload the page
      window.location.reload()
    } catch (err) {
      console.error('Unmatch error:', err)
      alert(err instanceof Error ? err.message : 'Failed to unmatch runners')
    }
  }

  function abortFetch() {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsFetchingPBs(false)
      setFetchProgress(null)
      setFetchMessage('Fetch aborted by user')
    }
  }

  async function fetchPBs(filter: 'all' | 'missing' | 'manual-only') {
    const controller = new AbortController()
    setAbortController(controller)
    setIsFetchingPBs(true)
    setFetchMessage(null)
    setShowFetchOptions(false)
    setFetchProgress(null)

    try {
      // Load all runners from localStorage
      const stored = localStorage.getItem('runners')
      if (!stored) throw new Error('No runners found in storage')

      const allRunners = JSON.parse(stored)

      // Filter for runners with DUV ID (regardless of match status)
      // If they have a DUV ID, they should be fetchable
      let matchedRunners = allRunners.filter((r: any) => r.duvId)

      // Debug: log match status distribution
      const withDuvId = allRunners.filter((r: any) => r.duvId).length
      const withoutDuvId = allRunners.filter((r: any) => !r.duvId).length
      const statusCounts = allRunners.reduce((acc: any, r: any) => {
        const status = r.duvId ? r.matchStatus : 'no-duv-id'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})

      // Find runners without DUV ID
      const runnersWithoutDuvId = allRunners
        .filter((r: any) => !r.duvId)
        .map((r: any) => `${r.firstname} ${r.lastname} (${r.nationality})`)

      console.log('=== RUNNER DEBUG INFO ===')
      console.log(`Total runners: ${allRunners.length}`)
      console.log(`With DUV ID: ${withDuvId}`)
      console.log(`Without DUV ID: ${withoutDuvId}`)
      console.log('Status distribution:', statusCounts)
      console.log('Runners without DUV ID:', runnersWithoutDuvId)
      console.log('=========================')

      // Show this info to user briefly
      setFetchMessage(`Found: ${allRunners.length} total, ${withDuvId} with DUV ID, ${withoutDuvId} without. Check console for details.`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Show for 2 seconds

      // Apply filter
      console.log('\n' + '='.repeat(60))
      console.log('APPLYING FILTER:', filter)
      console.log('Before filter - matched runners:', matchedRunners.length)

      if (filter === 'missing') {
        // Only fetch for runners with no PB data
        const before = matchedRunners.length
        matchedRunners = matchedRunners.filter((r: any) =>
          !r.personalBestAllTime && !r.personalBestLast2Years
        )
        console.log(`Filter "missing": ${before} → ${matchedRunners.length} runners`)
      } else if (filter === 'manual-only') {
        // Only fetch for manually-matched runners
        const before = matchedRunners.length
        matchedRunners = matchedRunners.filter((r: any) =>
          r.matchStatus === 'manually-matched'
        )
        console.log(`Filter "manual-only": ${before} → ${matchedRunners.length} runners`)
        console.log('Manual match statuses:', matchedRunners.map((r: any) => `${r.id}:${r.matchStatus}`).join(', '))

        // Log specifically if runner 284 is in there
        const runner284 = matchedRunners.find((r: any) => r.id === 284)
        if (runner284) {
          console.log('✓ Runner 284 IS in the list:')
          console.log('  Name:', runner284.firstname, runner284.lastname)
          console.log('  DUV ID:', runner284.duvId)
          console.log('  Entry ID:', runner284.entryId)
        } else {
          console.log('✗ Runner 284 is NOT in the manually-matched list')
          const runner284All = allRunners.find((r: any) => r.id === 284)
          if (runner284All) {
            console.log('  But runner 284 exists in all runners:')
            console.log('  Name:', runner284All.firstname, runner284All.lastname)
            console.log('  DUV ID:', runner284All.duvId)
            console.log('  Match Status:', runner284All.matchStatus)
          }
        }
      }

      console.log('='.repeat(60) + '\n')

      if (matchedRunners.length === 0) {
        setFetchMessage(`No runners found for filter: ${filter}`)
        return
      }

      const total = matchedRunners.length
      setFetchProgress({ current: 0, total })

      // Fetch one at a time to show progress
      let successCount = 0
      for (let i = 0; i < matchedRunners.length; i++) {
        // Check if aborted
        if (controller.signal.aborted) {
          setFetchMessage(`Aborted after ${successCount}/${total} runners`)
          break
        }

        const runner = matchedRunners[i]
        setFetchProgress({ current: i + 1, total })
        setFetchMessage(`Fetching PBs and performances... (${i + 1}/${total}) ${runner.firstname} ${runner.lastname}`)

        console.log(`\n${'='.repeat(60)}`)
        console.log(`FRONTEND: Fetching runner ${i + 1}/${total}`)
        console.log(`Name: ${runner.firstname} ${runner.lastname}`)
        console.log(`Entry ID: ${runner.entryId}`)
        console.log(`DUV ID: ${runner.duvId}`)
        console.log(`Match Status: ${runner.matchStatus}`)
        console.log(`Full runner being sent:`, runner)
        console.log(`${'='.repeat(60)}\n`)

        try {
          const response = await fetch('/api/fetch-performances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runners: [runner] }),
            signal: controller.signal
          })

          if (response.ok) {
            console.log(`✓ API call successful for ${runner.firstname} ${runner.lastname}`)
            const responseData = await response.json()
            console.log('Response data:', responseData)

            // Update localStorage with enriched runner data
            if (responseData.runners && responseData.runners.length > 0) {
              const enrichedRunner = responseData.runners[0]
              const stored = localStorage.getItem('runners')
              if (stored) {
                const allRunners = JSON.parse(stored)
                const index = allRunners.findIndex((r: any) => r.id === runner.id)
                if (index !== -1) {
                  // Update the runner with new PB data
                  allRunners[index] = {
                    ...allRunners[index],
                    personalBestAllTime: enrichedRunner.personalBestAllTime,
                    personalBestAllTimeYear: enrichedRunner.personalBestAllTimeYear,
                    personalBestLast3Years: enrichedRunner.personalBestLast3Years,
                    personalBestLast3YearsYear: enrichedRunner.personalBestLast3YearsYear,
                    dateOfBirth: enrichedRunner.dateOfBirth,
                    age: enrichedRunner.age,
                    performanceHistory: enrichedRunner.performanceHistory,
                  }
                  localStorage.setItem('runners', JSON.stringify(allRunners))
                  console.log('✓ Updated localStorage with new PB data')
                }
              }
            }

            successCount++
          } else {
            console.error(`✗ API call failed for ${runner.firstname} ${runner.lastname}`)
            console.error('Response status:', response.status)
            const errorData = await response.text()
            console.error('Error response:', errorData)
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setFetchMessage(`Aborted after ${successCount}/${total} runners`)
            break
          }
          console.error(`✗ Exception during fetch for ${runner.firstname} ${runner.lastname}:`, err)
        }
      }

      if (!controller.signal.aborted) {
        setFetchProgress(null)
        setFetchMessage(`Successfully fetched PBs and performances for ${successCount}/${total} runners! Team rankings updated automatically.`)
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Fetch PBs error:', err)
        setFetchMessage(err instanceof Error ? err.message : 'Failed to fetch PBs')
      }
      setFetchProgress(null)
    } finally {
      setIsFetchingPBs(false)
      setAbortController(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading unmatched runners...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Manual DUV Matching</h1>
              <p className="mt-2 text-muted-foreground">
                {runners.length} runners missing DUV ID
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={unmatchAllWithoutDuvId} variant="outline" size="lg">
                Unmatch All Without DUV ID
              </Button>
              {isFetchingPBs ? (
                <Button onClick={abortFetch} size="lg" variant="destructive">
                  <X className="h-4 w-4 mr-2" />
                  Abort Fetch
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg">
                      <Database className="h-4 w-4 mr-2" />
                      Fetch PBs
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => fetchPBs('missing')}>
                      Fetch Missing PBs Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fetchPBs('manual-only')}>
                      Fetch Manual Matches Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fetchPBs('all')}>
                      Fetch All Matched Runners
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {fetchMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              fetchMessage.includes('Successfully') || fetchMessage.includes('updated')
                ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                : fetchMessage.includes('Failed') || fetchMessage.includes('error')
                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
            }`}>
              <div>{fetchMessage}</div>
              {fetchProgress && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300"
                        style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">
                      {fetchProgress.current}/{fetchProgress.total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Unmatched Runners List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Runners Missing DUV ID</CardTitle>
                <CardDescription>All runners without DUV ID - match them to DUV profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {runners.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      All runners matched!
                    </p>
                  ) : (
                    runners.map((runner) => (
                      <button
                        key={runner.id}
                        onClick={() => {
                          setSelectedRunner(runner)
                          searchDUV(runner)
                          // Scroll to top on mobile, or scroll the right panel into view
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedRunner?.id === runner.id
                            ? 'bg-accent border-accent-foreground'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {runner.firstname} {runner.lastname}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {runner.nationality} • {runner.gender}
                            </div>
                          </div>
                          {runner.candidates.length > 0 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {runner.candidates.length} candidates
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Search Results (Sticky) */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {selectedRunner ? (
              <>
                {/* Currently Selected Runner */}
                <Card className="mb-6 border-2 border-primary">
                  <CardHeader>
                    <CardTitle>Matching Runner</CardTitle>
                    <CardDescription>
                      Find DUV profile for this runner
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-accent">
                      <div className="font-bold text-lg">
                        {selectedRunner.firstname} {selectedRunner.lastname}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedRunner.nationality} • {selectedRunner.gender}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Entry ID: {selectedRunner.entry_id}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => markAsNoMatch(selectedRunner.id)}
                      className="mt-3 w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      No Match (Not in DUV)
                    </Button>
                  </CardContent>
                </Card>

                {/* Manual Search Input - only shown when runner selected */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Alternative DUV Search</CardTitle>
                    <CardDescription>
                      Try different search terms to find more matches for {selectedRunner.firstname} {selectedRunner.lastname}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        manualSearch()
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="e.g., De Souza, John Smith..."
                        value={manualSearchInput}
                        onChange={(e) => setManualSearchInput(e.target.value)}
                      />
                      <Button type="submit" disabled={searching || !manualSearchInput.trim()}>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Search Results */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    DUV Search Results
                  </CardTitle>
                  <CardDescription>
                    {selectedRunner ? `Matching: ${selectedRunner.firstname} ${selectedRunner.lastname}` : `Search: ${searchQuery}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Show DUV search results */}
                      {searchResults.length > 0 && (
                        <>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            {isManualSearch ? 'Manual' : 'Automatic'} search results ({searchResults.length}):
                          </div>
                          {searchResults.map((result) => (
                            <div
                              key={result.PersonID}
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {result.FirstName} {result.LastName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {result.Nationality} • {result.Gender} • YOB: {result.YOB || 'N/A'}
                                  </div>
                                  {result.City && (
                                    <div className="text-sm text-muted-foreground">
                                      City: {result.City}
                                    </div>
                                  )}
                                  {result.ActivRange && (
                                    <div className="text-xs text-muted-foreground">
                                      Active: {result.ActivRange}
                                    </div>
                                  )}
                                </div>
                                {selectedRunner ? (
                                  <Button
                                    size="sm"
                                    onClick={() => selectMatch(selectedRunner.id, parseInt(result.PersonID))}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Match
                                  </Button>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Select a runner to match
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Divider between search results and auto-detected */}
                          {selectedRunner && selectedRunner.candidates.length > 0 && (
                            <div className="border-t my-4"></div>
                          )}
                        </>
                      )}

                      {/* Show message when no search results and no auto-detected candidates */}
                      {searchResults.length === 0 && selectedRunner && selectedRunner.candidates.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4">
                          No matches found. Try using the manual search above with different search terms.
                        </p>
                      )}

                      {/* Show auto-detected candidates below search results */}
                      {selectedRunner && selectedRunner.candidates.length > 0 && (
                        <>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Auto-detected candidates:
                          </div>
                          {selectedRunner.candidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {candidate.firstname} {candidate.lastname}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {candidate.nation} • {candidate.sex} • YOB: {candidate.year_of_birth || 'N/A'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    PB: {candidate.personal_best}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Confidence: {(candidate.confidence * 100).toFixed(0)}%
                                  </div>
                                </div>
                                {selectedRunner && (
                                  <Button
                                    size="sm"
                                    onClick={() => selectMatch(selectedRunner.id, candidate.duv_person_id)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Match
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Runner Selected</CardTitle>
                  <CardDescription>
                    Select a runner from the list to see DUV matches
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

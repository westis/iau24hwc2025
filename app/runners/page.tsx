'use client'

import * as React from 'react'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactCountryFlag from 'react-country-flag'
import { RunnerTable } from '@/components/tables/runner-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { getCountryCodeForFlag } from '@/lib/utils/country-codes'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Runner } from '@/types/runner'

function RunnersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<'M' | 'W'>(() => {
    const gender = searchParams.get('gender')
    return (gender === 'W' ? 'W' : 'M') as 'M' | 'W'
  })
  const [selectedMetric, setSelectedMetric] = useState<'last-3-years' | 'all-time'>(() => {
    const metric = searchParams.get('metric')
    return (metric === 'all-time' ? 'all-time' : 'last-3-years') as 'last-3-years' | 'all-time'
  })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [countryFilter, setCountryFilter] = useState<string>(() => searchParams.get('country') || 'all')
  const [countryComboboxOpen, setCountryComboboxOpen] = useState(false)
  const [isPending, startTransition] = React.useTransition()

  // Update URL when filters change
  const updateURL = (params: { gender?: 'M' | 'W'; metric?: 'last-3-years' | 'all-time'; country?: string; search?: string }) => {
    const newParams = new URLSearchParams(searchParams.toString())

    if (params.gender) newParams.set('gender', params.gender)
    if (params.metric) newParams.set('metric', params.metric)
    if (params.country && params.country !== 'all') {
      newParams.set('country', params.country)
    } else {
      newParams.delete('country')
    }
    if (params.search && params.search.trim()) {
      newParams.set('search', params.search)
    } else {
      newParams.delete('search')
    }

    router.push(`/runners?${newParams.toString()}`, { scroll: false })
  }

  // Get unique countries from runners
  const uniqueCountries = useMemo(() => {
    const countries = Array.from(new Set(runners.map(r => r.nationality))).sort()
    return countries
  }, [runners])

  useEffect(() => {
    // Fetch runners from API (Supabase)
    async function fetchRunners() {
      try {
        setLoading(true)

        const response = await fetch('/api/runners')
        if (!response.ok) {
          throw new Error('Failed to fetch runners from API')
        }

        const data = await response.json()
        const fetchedRunners = data.runners as Runner[]

        console.log('Fetched runners from API:', fetchedRunners.length)

        // Debug: Count runners by status
        const byStatus = fetchedRunners.reduce((acc: any, r: Runner) => {
          acc[r.matchStatus] = (acc[r.matchStatus] || 0) + 1
          return acc
        }, {})
        console.log('Runners by match status:', byStatus)

        // Debug: Count runners with/without DUV ID
        const withDuv = fetchedRunners.filter((r: Runner) => r.duvId !== null).length
        const withoutDuv = fetchedRunners.filter((r: Runner) => r.duvId === null).length
        console.log(`With DUV ID: ${withDuv}, Without DUV ID: ${withoutDuv}`)

        // NOTE: localStorage caching removed - data too large and exceeds quota

        setRunners(fetchedRunners)
      } catch (err) {
        console.error('Error loading runners from API:', err)
        setError(err instanceof Error ? err.message : 'Failed to load runners')
      } finally {
        setLoading(false)
      }
    }

    fetchRunners()
  }, [])

  // Filter, sort, and add rankings
  const runnersWithRankings = useMemo(() => {
    // Get PB value based on selected metric
    const getPB = (runner: Runner) => {
      return selectedMetric === 'last-3-years'
        ? runner.personalBestLast3Years || 0
        : runner.personalBestAllTime || 0
    }

    // Filter by gender
    let filtered = runners.filter(runner => runner.gender === selectedGender)

    // Filter by country
    if (countryFilter !== 'all') {
      filtered = filtered.filter(runner => runner.nationality === countryFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(runner => {
        const name = `${runner.firstname} ${runner.lastname}`.toLowerCase()
        return name.includes(query)
      })
    }

    // Separate matched (with DUV ID) and unmatched runners
    const matched = filtered.filter(r => r.duvId !== null)
    const unmatched = filtered.filter(r => r.duvId === null)

    // Sort matched runners by PB (highest first) - includes both DNS and non-DNS
    const sortedMatched = matched.sort((a, b) => {
      const aPB = getPB(a)
      const bPB = getPB(b)
      return bPB - aPB // Descending order (highest PB first)
    })

    // Sort unmatched runners by name
    const sortedUnmatched = unmatched.sort((a, b) => {
      const aName = `${a.lastname} ${a.firstname}`.toLowerCase()
      const bName = `${b.lastname} ${b.firstname}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    // Assign rankings only to non-DNS runners with DUV ID
    let currentRank = 1
    const rankedMatched = sortedMatched.map((runner) => {
      if (runner.dns) {
        // DNS runner - no rank
        return { ...runner, rank: undefined }
      } else {
        // Active runner - assign rank
        return { ...runner, rank: currentRank++ }
      }
    })

    // Combine: ranked matched first (with DNS in natural position), then unmatched
    return [...rankedMatched, ...sortedUnmatched]
  }, [runners, selectedGender, selectedMetric, countryFilter, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.runners.loadingRunners}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.runners.error}: {error}</p>
          <p className="text-muted-foreground">{t.runners.runBackendTools}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t.runners.title}</h1>
        </div>

        {/* Filters - Responsive Layout */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          {/* Row 1: Gender and Metric toggles */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
              <Button
                variant={selectedGender === 'M' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => startTransition(() => {
                  setSelectedGender('M')
                  updateURL({ gender: 'M', metric: selectedMetric, country: countryFilter, search: searchQuery })
                })}
                className={selectedGender === 'M' ? '' : 'hover:bg-accent'}
                disabled={isPending}
              >
                {t.runners.men}
              </Button>
              <Button
                variant={selectedGender === 'W' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => startTransition(() => {
                  setSelectedGender('W')
                  updateURL({ gender: 'W', metric: selectedMetric, country: countryFilter, search: searchQuery })
                })}
                className={selectedGender === 'W' ? '' : 'hover:bg-accent'}
                disabled={isPending}
              >
                {t.runners.women}
              </Button>
            </div>
            <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
              <Button
                variant={selectedMetric === 'last-3-years' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => startTransition(() => {
                  setSelectedMetric('last-3-years')
                  updateURL({ gender: selectedGender, metric: 'last-3-years', country: countryFilter, search: searchQuery })
                })}
                className={selectedMetric === 'last-3-years' ? '' : 'hover:bg-accent'}
                disabled={isPending}
              >
                2023-2025
              </Button>
              <Button
                variant={selectedMetric === 'all-time' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => startTransition(() => {
                  setSelectedMetric('all-time')
                  updateURL({ gender: selectedGender, metric: 'all-time', country: countryFilter, search: searchQuery })
                })}
                className={selectedMetric === 'all-time' ? '' : 'hover:bg-accent'}
                disabled={isPending}
              >
                {t.runners.allTime}
              </Button>
            </div>
          </div>

          {/* Row 2: Search and Country filter */}
          <div className="flex flex-col sm:flex-row gap-4 lg:ml-auto">
            <Input
              placeholder={t.runners.searchByName}
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                setSearchQuery(value)
                updateURL({ gender: selectedGender, metric: selectedMetric, country: countryFilter, search: value })
              }}
              className="w-full sm:w-[200px]"
            />
            <Popover open={countryComboboxOpen} onOpenChange={setCountryComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryComboboxOpen}
                  className="w-full sm:w-[200px] justify-between"
                >
                  {countryFilter === 'all' ? (
                    t.runners.allCountries
                  ) : (
                    <div className="flex items-center gap-2">
                      <ReactCountryFlag
                        countryCode={getCountryCodeForFlag(countryFilter)}
                        svg
                        style={{
                          width: '1.5em',
                          height: '1em',
                        }}
                      />
                      <span>{countryFilter}</span>
                    </div>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t.runners.searchCountry} />
                  <CommandList>
                    <CommandEmpty>{t.runners.noCountryFound}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setCountryFilter('all')
                          updateURL({ gender: selectedGender, metric: selectedMetric, country: 'all', search: searchQuery })
                          setCountryComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            countryFilter === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {t.runners.allCountries}
                      </CommandItem>
                      {uniqueCountries.map((country) => {
                        const twoLetterCode = getCountryCodeForFlag(country)
                        return (
                          <CommandItem
                            key={country}
                            value={country}
                            onSelect={(currentValue) => {
                              const upperValue = currentValue.toUpperCase()
                              setCountryFilter(upperValue)
                              updateURL({ gender: selectedGender, metric: selectedMetric, country: upperValue, search: searchQuery })
                              setCountryComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                countryFilter === country ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <ReactCountryFlag
                                countryCode={twoLetterCode}
                                svg
                                style={{
                                  width: '1.5em',
                                  height: '1em',
                                }}
                              />
                              <span>{country}</span>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <RunnerTable
          runners={runnersWithRankings}
          metric={selectedMetric}
          onManualMatch={(runner) => {
            router.push('/match')
          }}
          onRowClick={(runnerId) => {
            router.push(`/runners/${runnerId}`)
          }}
        />
      </div>
    </main>
  )
}

function RunnersPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function RunnersPage() {
  return (
    <Suspense fallback={<RunnersPageFallback />}>
      <RunnersPageContent />
    </Suspense>
  )
}

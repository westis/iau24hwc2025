'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Runner, Gender } from '@/types/runner'

// Dynamic import to avoid SSR issues with react-leaflet
const ChoroplethMap = dynamic(
  () => import('@/components/choropleth-map').then(mod => mod.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }
)

export default function StatsPage() {
  const { t } = useLanguage()
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<Gender>('M')

  useEffect(() => {
    async function fetchRunners() {
      try {
        setLoading(true)
        const response = await fetch('/api/runners')
        if (!response.ok) {
          throw new Error('Failed to fetch runners from API')
        }

        const data = await response.json()
        setRunners(data.runners as Runner[])
      } catch (err) {
        console.error('Error loading runners:', err)
        setError(err instanceof Error ? err.message : 'Failed to load runners')
      } finally {
        setLoading(false)
      }
    }

    fetchRunners()
  }, [])

  // Filter runners by gender and exclude DNS
  const filteredRunners = useMemo(() => {
    return runners.filter(r => r.gender === selectedGender && !r.dns)
  }, [runners, selectedGender])

  // Calculate age distribution
  const ageDistribution = useMemo(() => {
    const ageBuckets: { [key: string]: number } = {
      '20-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50-59': 0,
      '60-69': 0,
      '70+': 0,
    }

    filteredRunners.forEach(runner => {
      if (runner.age) {
        if (runner.age < 30) ageBuckets['20-29']++
        else if (runner.age < 40) ageBuckets['30-39']++
        else if (runner.age < 50) ageBuckets['40-49']++
        else if (runner.age < 60) ageBuckets['50-59']++
        else if (runner.age < 70) ageBuckets['60-69']++
        else ageBuckets['70+']++
      }
    })

    const maxCount = Math.max(...Object.values(ageBuckets))

    return Object.entries(ageBuckets).map(([range, count]) => ({
      range,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
    }))
  }, [filteredRunners])

  // Calculate PB distribution
  const pbDistribution = useMemo(() => {
    const pbBuckets: { [key: string]: number } = {}

    // Use last 3 years PB for more recent data
    const runnersWithPB = filteredRunners.filter(r => r.personalBestLast3Years)

    if (runnersWithPB.length === 0) return []

    // Determine bucket size based on gender
    const bucketSize = selectedGender === 'M' ? 10 : 10 // 10km buckets for both

    runnersWithPB.forEach(runner => {
      if (runner.personalBestLast3Years) {
        const pb = runner.personalBestLast3Years
        const bucket = Math.floor(pb / bucketSize) * bucketSize
        const bucketKey = `${bucket}-${bucket + bucketSize}`
        pbBuckets[bucketKey] = (pbBuckets[bucketKey] || 0) + 1
      }
    })

    // Sort by bucket range
    const sortedBuckets = Object.entries(pbBuckets).sort((a, b) => {
      const aStart = parseInt(a[0].split('-')[0])
      const bStart = parseInt(b[0].split('-')[0])
      return aStart - bStart
    })

    const maxCount = Math.max(...Object.values(pbBuckets))

    return sortedBuckets.map(([range, count]) => ({
      range,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
    }))
  }, [filteredRunners, selectedGender])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const withAge = filteredRunners.filter(r => r.age)
    const withPB = filteredRunners.filter(r => r.personalBestLast3Years)

    const avgAge = withAge.length > 0
      ? withAge.reduce((sum, r) => sum + (r.age || 0), 0) / withAge.length
      : 0

    const avgPB = withPB.length > 0
      ? withPB.reduce((sum, r) => sum + (r.personalBestLast3Years || 0), 0) / withPB.length
      : 0

    const minAge = withAge.length > 0 ? Math.min(...withAge.map(r => r.age || 0)) : 0
    const maxAge = withAge.length > 0 ? Math.max(...withAge.map(r => r.age || 0)) : 0

    const minPB = withPB.length > 0 ? Math.min(...withPB.map(r => r.personalBestLast3Years || 0)) : 0
    const maxPB = withPB.length > 0 ? Math.max(...withPB.map(r => r.personalBestLast3Years || 0)) : 0

    return {
      totalRunners: filteredRunners.length,
      avgAge: avgAge.toFixed(1),
      minAge,
      maxAge,
      avgPB: avgPB.toFixed(3),
      minPB: minPB.toFixed(3),
      maxPB: maxPB.toFixed(3),
    }
  }, [filteredRunners])

  // Calculate country participation (all genders - not filtered)
  const countryParticipation = useMemo(() => {
    const countryMap = new Map<string, { men: number; women: number; total: number }>()

    runners.filter(r => !r.dns).forEach(runner => {
      const current = countryMap.get(runner.nationality) || { men: 0, women: 0, total: 0 }

      if (runner.gender === 'M') {
        current.men++
      } else {
        current.women++
      }
      current.total++

      countryMap.set(runner.nationality, current)
    })

    // Convert to array and sort by total descending
    return Array.from(countryMap.entries())
      .map(([country, counts]) => ({ country, ...counts }))
      .sort((a, b) => b.total - a.total)
  }, [runners])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.common.error}: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t.stats.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.stats.subtitle}
        </p>
      </div>

      {/* Gender Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-input bg-background p-1" role="group">
          <Button
            variant={selectedGender === 'M' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedGender('M')}
            className={selectedGender === 'M' ? '' : 'hover:bg-accent'}
          >
            {t.common.men}
          </Button>
          <Button
            variant={selectedGender === 'W' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedGender('W')}
            className={selectedGender === 'W' ? '' : 'hover:bg-accent'}
          >
            {t.common.women}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.stats.totalRunners}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryStats.totalRunners}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.stats.averageAge}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryStats.avgAge}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.stats.range}: {summaryStats.minAge} - {summaryStats.maxAge}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.stats.averagePB}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryStats.avgPB} km</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.stats.range}: {summaryStats.minPB} - {summaryStats.maxPB} km
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different stats */}
      <Tabs defaultValue="age" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="age">{t.stats.ageDistribution}</TabsTrigger>
          <TabsTrigger value="pb">{t.stats.pbDistribution}</TabsTrigger>
          <TabsTrigger value="countries">{t.stats.countries}</TabsTrigger>
          <TabsTrigger value="map">{t.stats.map}</TabsTrigger>
        </TabsList>

        {/* Age Distribution Tab */}
        <TabsContent value="age">
          <Card>
            <CardHeader>
              <CardTitle>{t.stats.ageDistribution} - {selectedGender === 'M' ? t.common.men : t.common.women}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-80 gap-0.5">
                {ageDistribution.map((bucket) => (
                  <div key={bucket.range} className="flex flex-col items-center flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1">{bucket.count}</div>
                    <div className="w-full flex flex-col justify-end items-center" style={{ height: '16rem' }}>
                      <div
                        className="bg-primary w-full rounded-t-md transition-all flex items-end justify-center pb-1"
                        style={{ height: `${bucket.percentage}%`, minHeight: bucket.count > 0 ? '20px' : '0' }}
                      >
                        {bucket.count > 0 && (
                          <span className="text-xs font-medium text-primary-foreground">
                            {bucket.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs mt-2 text-muted-foreground whitespace-nowrap truncate w-full text-center">{bucket.range}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PB Distribution Tab */}
        <TabsContent value="pb">
          <Card>
            <CardHeader>
              <CardTitle>{t.stats.pbDistribution} - {selectedGender === 'M' ? t.common.men : t.common.women}</CardTitle>
            </CardHeader>
            <CardContent>
              {pbDistribution.length === 0 ? (
                <p className="text-muted-foreground">{t.stats.noPBData}</p>
              ) : (
                <div className="flex items-end justify-between h-80 gap-0.5 overflow-x-auto">
                  {pbDistribution.map((bucket) => (
                    <div key={bucket.range} className="flex flex-col items-center flex-1 min-w-0">
                      <div className="text-sm font-medium mb-1">{bucket.count}</div>
                      <div className="w-full flex flex-col justify-end items-center" style={{ height: '16rem' }}>
                        <div
                          className="bg-primary w-full rounded-t-md transition-all flex items-end justify-center pb-1"
                          style={{ height: `${bucket.percentage}%`, minHeight: bucket.count > 0 ? '20px' : '0' }}
                        >
                          {bucket.count > 0 && (
                            <span className="text-xs font-medium text-primary-foreground">
                              {bucket.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs mt-2 text-muted-foreground whitespace-nowrap truncate w-full text-center">{bucket.range} km</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Countries Tab */}
        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <CardTitle>{t.stats.participatingCountries} ({countryParticipation.length}) - {t.stats.allGenders}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {countryParticipation.map((country) => (
                  <div
                    key={country.country}
                    className="border border-border rounded-lg p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{country.country}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {t.stats.total}: {country.total}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">M:</span>
                        <span className="font-medium">{country.men}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">W:</span>
                        <span className="font-medium">{country.women}</span>
                      </div>
                    </div>
                    {/* Visual bar showing men/women ratio */}
                    <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden flex">
                      {country.men > 0 && (
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${(country.men / country.total) * 100}%` }}
                        />
                      )}
                      {country.women > 0 && (
                        <div
                          className="bg-pink-500 h-full"
                          style={{ width: `${(country.women / country.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>{t.stats.map} - {t.stats.participatingCountries} ({countryParticipation.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ChoroplethMap countries={countryParticipation} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

"use client"

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Import Clock icon along with other icons.
import { Calendar, MapPin, ExternalLink, Clock } from 'lucide-react'
import type { RaceInfo } from '@/types/race'
// Import Next.js Image component to optimize images instead of using <img>.
import Image from 'next/image'

export default function LoppetPage() {
  const { t, language } = useLanguage()
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRaceInfo() {
      try {
        const response = await fetch('/api/race')
        if (!response.ok) {
          throw new Error('Failed to fetch race information')
        }
        const data = await response.json()
        setRaceInfo(data)
      } catch (err) {
        console.error('Error fetching race info:', err)
        setError(err instanceof Error ? err.message : 'Failed to load race information')
      } finally {
        setLoading(false)
      }
    }

    fetchRaceInfo()
  }, [])

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

  if (error || !raceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.common.error}: {error || 'No race information available'}</p>
        </div>
      </div>
    )
  }

  const raceName = language === 'sv' ? raceInfo.raceNameSv : raceInfo.raceNameEn
  const description = language === 'sv' ? raceInfo.descriptionSv : raceInfo.descriptionEn

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{raceName}</h1>
          {description && (
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Race Information Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t.race.dateTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {new Date(raceInfo.startDate).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-muted-foreground flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4" />
                {new Date(raceInfo.startDate).toLocaleTimeString(language === 'sv' ? 'sv-SE' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t.race.location}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{raceInfo.locationName}</p>
              {raceInfo.locationAddress && (
                <p className="text-muted-foreground mt-2">{raceInfo.locationAddress}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Results Link */}
        {raceInfo.liveResultsUrl && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <a
                href={raceInfo.liveResultsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="lg" className="w-full" variant="default">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  {t.race.viewLiveResults}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Course Map */}
        {raceInfo.courseMapUrl && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t.race.courseMap}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                {/* Use Next.js Image component instead of a bare <img> tag. */}
                <Image
                  src={raceInfo.courseMapUrl}
                  alt={typeof t.race.courseMap === 'string' ? t.race.courseMap : 'Course Map'}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules & Description */}
        {(language === 'sv' ? raceInfo.rulesSv : raceInfo.rulesEn) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t.race.rules}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">
                  {language === 'sv' ? raceInfo.rulesSv : raceInfo.rulesEn}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        {(raceInfo.contactEmail || raceInfo.contactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle>{t.race.contact}</CardTitle>
            </CardHeader>
            <CardContent>
              {raceInfo.contactEmail && (
                <p className="mb-2">
                  <span className="font-medium">Email:</span>{' '}
                  <a href={`mailto:${raceInfo.contactEmail}`} className="text-primary hover:underline">
                    {raceInfo.contactEmail}
                  </a>
                </p>
              )}
              {raceInfo.contactPhone && (
                <p>
                  <span className="font-medium">Phone:</span>{' '}
                  <a href={`tel:${raceInfo.contactPhone}`} className="text-primary hover:underline">
                    {raceInfo.contactPhone}
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

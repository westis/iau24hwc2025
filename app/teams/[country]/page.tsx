'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil } from 'lucide-react'
import Image from 'next/image'

interface TeamData {
  country_code: string
  team_photo_url: string | null
  description: string | null
}

interface Runner {
  id: number
  entryId: string
  firstname: string
  lastname: string
  nationality: string
  gender: string
  photoUrl?: string | null
  personalBestAllTime?: number | null
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeamData() {
      try {
        const country = params.country as string

        // Fetch team data
        const teamResponse = await fetch(`/api/teams/${country}`)
        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team data')
        }
        const teamData = await teamResponse.json()
        setTeam(teamData)

        // Fetch all runners
        const runnersResponse = await fetch('/api/runners')
        if (!runnersResponse.ok) {
          throw new Error('Failed to fetch runners')
        }
        const runnersData = await runnersResponse.json()

        // Filter runners by nationality
        const teamRunners = runnersData.runners.filter(
          (r: Runner) => r.nationality === country.toUpperCase()
        )
        setRunners(teamRunners)

      } catch (err) {
        console.error('Error loading team:', err)
        setError(err instanceof Error ? err.message : 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    if (params.country) {
      loadTeamData()
    }
  }, [params.country])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error || 'Team not found'}</p>
          <Button onClick={() => router.push('/runners')}>Back to Runners</Button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/runners')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Runners
        </Button>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              Team {team.country_code}
            </h1>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/teams/${team.country_code}`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Team
              </Button>
            )}
          </div>
        </div>

        {/* Team Info Section */}
        {(team.team_photo_url || team.description) && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6">
                {team.team_photo_url && (
                  <div className="md:col-span-1">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={team.team_photo_url}
                        alt={`Team ${team.country_code}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </div>
                )}
                {team.description && (
                  <div className={team.team_photo_url ? "md:col-span-2" : "md:col-span-3"}>
                    <h3 className="text-lg font-semibold mb-2">About Team {team.country_code}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{team.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Runners Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              Team Runners ({runners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runners.length === 0 ? (
              <p className="text-muted-foreground">No runners found for this team</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {runners.map((runner) => (
                  <Card
                    key={runner.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/runners/${runner.entryId}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {runner.photoUrl ? (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={runner.photoUrl}
                              alt={`${runner.firstname} ${runner.lastname}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-muted-foreground">
                              {runner.firstname[0]}{runner.lastname[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {runner.firstname} {runner.lastname}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {runner.gender}
                            </Badge>
                            {runner.personalBestAllTime && (
                              <span className="text-xs text-muted-foreground">
                                PB: {runner.personalBestAllTime.toFixed(1)} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

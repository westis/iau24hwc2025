// lib/strava/api.ts - Strava API integration

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

interface StravaActivity {
  id: number
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number
  total_elevation_gain: number // meters
  type: string
  start_date: string
  start_date_local: string
  timezone: string
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
}

interface StravaAthlete {
  id: number
  username: string
  firstname: string
  lastname: string
  city: string
  state: string
  country: string
  sex: string
  premium: boolean
  created_at: string
  updated_at: string
  profile_medium: string
  profile: string
  bio?: string
  weight?: number
  ftp?: number
}

interface StravaStats {
  biggest_ride_distance: number
  biggest_climb_elevation_gain: number
  recent_ride_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  recent_run_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  ytd_ride_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  ytd_run_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  all_ride_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  all_run_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
}

export async function getAthleteProfile(athleteId: number): Promise<StravaAthlete> {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('STRAVA_ACCESS_TOKEN not configured')
  }

  const response = await fetch(`${STRAVA_API_BASE}/athletes/${athleteId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getAthleteStats(athleteId: number): Promise<StravaStats> {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('STRAVA_ACCESS_TOKEN not configured')
  }

  const response = await fetch(`${STRAVA_API_BASE}/athletes/${athleteId}/stats`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getAthleteActivities(
  athleteId?: number,
  options: {
    after?: number // epoch timestamp
    before?: number // epoch timestamp
    page?: number
    per_page?: number
  } = {}
): Promise<StravaActivity[]> {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('STRAVA_ACCESS_TOKEN not configured')
  }

  const params = new URLSearchParams()
  if (options.after) params.append('after', options.after.toString())
  if (options.before) params.append('before', options.before.toString())
  if (options.page) params.append('page', options.page.toString())
  params.append('per_page', (options.per_page || 50).toString())

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export function extractAthleteIdFromUrl(url: string): number | null {
  // Match patterns like:
  // https://www.strava.com/athletes/12345
  // https://strava.com/athletes/12345
  const match = url.match(/strava\.com\/athletes\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export async function fetchCompleteAthleteData(athleteId: number) {
  // Calculate date 12 weeks ago
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84) // 12 weeks = 84 days
  const afterTimestamp = Math.floor(twelveWeeksAgo.getTime() / 1000)

  const [profile, stats, activities] = await Promise.all([
    getAthleteProfile(athleteId),
    getAthleteStats(athleteId),
    getAthleteActivities(athleteId, {
      after: afterTimestamp,
      per_page: 50
    })
  ])

  // Filter for runs only
  const runActivities = activities.filter(a => a.type === 'Run')

  // Calculate training metrics
  const last4Weeks = calculatePeriodMetrics(runActivities, 28)
  const last8Weeks = calculatePeriodMetrics(runActivities, 56)
  const last12Weeks = calculatePeriodMetrics(runActivities, 84)

  return {
    profile,
    stats,
    activities: runActivities,
    metrics: {
      last4Weeks,
      last8Weeks,
      last12Weeks,
      longestRun: runActivities.reduce((max, a) =>
        a.distance > max ? a.distance : max, 0
      ) / 1000, // convert to km
      biggestWeek: calculateBiggestWeek(runActivities)
    }
  }
}

function calculatePeriodMetrics(activities: StravaActivity[], days: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const periodActivities = activities.filter(a =>
    new Date(a.start_date) >= cutoffDate
  )

  return {
    count: periodActivities.length,
    distance: periodActivities.reduce((sum, a) => sum + a.distance, 0) / 1000, // km
    time: periodActivities.reduce((sum, a) => sum + a.moving_time, 0) / 3600, // hours
    elevation: periodActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0), // meters
    avgPace: calculateAvgPace(periodActivities)
  }
}

function calculateAvgPace(activities: StravaActivity[]): number {
  if (activities.length === 0) return 0
  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0)
  const totalTime = activities.reduce((sum, a) => sum + a.moving_time, 0)
  return totalDistance > 0 ? totalTime / (totalDistance / 1000) : 0 // seconds per km
}

function calculateBiggestWeek(activities: StravaActivity[]): number {
  if (activities.length === 0) return 0

  // Group activities by week
  const weeklyTotals = new Map<string, number>()

  activities.forEach(activity => {
    const date = new Date(activity.start_date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0]

    weeklyTotals.set(
      weekKey,
      (weeklyTotals.get(weekKey) || 0) + activity.distance
    )
  })

  return Math.max(...Array.from(weeklyTotals.values())) / 1000 // km
}

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'
import { extractAthleteIdFromUrl, fetchCompleteAthleteData } from '@/lib/strava/api'

export const dynamic = 'force-dynamic'

// POST /api/runners/[id]/strava - Fetch Strava data for a runner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { stravaUrl } = body

    if (!stravaUrl) {
      return NextResponse.json(
        { error: 'Strava URL is required' },
        { status: 400 }
      )
    }

    // Extract athlete ID from URL
    const athleteId = extractAthleteIdFromUrl(stravaUrl)
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Invalid Strava URL. Expected format: https://www.strava.com/athletes/12345' },
        { status: 400 }
      )
    }

    console.log(`Fetching Strava data for athlete ${athleteId}...`)

    // Fetch complete athlete data from Strava
    const data = await fetchCompleteAthleteData(athleteId)

    console.log(`✓ Fetched ${data.activities.length} activities`)

    // Update runner in database
    const db = getDatabase()
    await db.query(`
      UPDATE runners SET
        strava_url = $1,
        strava_athlete_id = $2,
        strava_photo_url = $3,
        strava_data = $4,
        strava_last_fetched = NOW()
      WHERE id = $5
    `, [
      stravaUrl,
      athleteId,
      data.profile.profile_medium || data.profile.profile,
      JSON.stringify(data),
      id
    ])

    return NextResponse.json({
      success: true,
      athleteId,
      profile: {
        name: `${data.profile.firstname} ${data.profile.lastname}`,
        location: [data.profile.city, data.profile.state, data.profile.country]
          .filter(Boolean).join(', '),
        photo: data.profile.profile_medium || data.profile.profile,
      },
      metrics: data.metrics,
      activityCount: data.activities.length
    })
  } catch (error) {
    console.error('Error fetching Strava data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch Strava data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// DELETE /api/runners/[id]/strava - Remove Strava data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()

    await db.query(`
      UPDATE runners SET
        strava_url = NULL,
        strava_athlete_id = NULL,
        strava_photo_url = NULL,
        strava_data = NULL,
        strava_last_fetched = NULL
      WHERE id = $1
    `, [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing Strava data:', error)
    return NextResponse.json(
      { error: 'Failed to remove Strava data' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const runnerId = parseInt(id)

    if (isNaN(runnerId)) {
      return NextResponse.json({ error: 'Invalid runner ID' }, { status: 400 })
    }

    const db = getDatabase()

    // Get runner details
    const runnerResult = await db.query(`
      SELECT * FROM runners WHERE id = $1
    `, [runnerId])

    const runner = runnerResult.rows[0]

    if (!runner) {
      return NextResponse.json({ error: 'Runner not found' }, { status: 404 })
    }

    // Get performances for this runner
    const performancesResult = await db.query(`
      SELECT * FROM performances
      WHERE runner_id = $1
      ORDER BY event_date DESC
    `, [runnerId])

    // Transform to camelCase to match frontend expectations
    const transformedRunner = {
      id: runner.id,
      entryId: runner.entry_id,
      firstname: runner.firstname,
      lastname: runner.lastname,
      nationality: runner.nationality,
      gender: runner.gender,
      dns: runner.dns || false,
      duvId: runner.duv_id,
      matchStatus: runner.match_status,
      matchConfidence: runner.match_confidence,
      personalBestAllTime: runner.personal_best_all_time,
      personalBestAllTimeYear: runner.personal_best_all_time_year,
      personalBestLast3Years: runner.personal_best_last_2_years,
      personalBestLast3YearsYear: runner.personal_best_last_2_years_year,
      dateOfBirth: runner.date_of_birth,
      age: runner.age,
      allPBs: runner.all_pbs || [],
      photoUrl: runner.photo_url,
      bio: runner.bio,
      instagramUrl: runner.instagram_url,
      stravaUrl: runner.strava_url,
      performanceHistory: performancesResult.rows.map((perf: any) => ({
        eventId: perf.event_id,
        eventName: perf.event_name,
        date: perf.event_date,
        distance: perf.distance,
        rank: perf.rank,
        rankGender: perf.rank_gender,
        eventType: perf.event_type,
      }))
    }

    return NextResponse.json({
      runner: transformedRunner
    })
  } catch (error) {
    console.error('Error fetching runner profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runner profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const db = getDatabase()

    // Validate input
    const allowedFields = ['firstname', 'lastname', 'nationality', 'gender', 'dns', 'photo_url', 'bio', 'instagram_url', 'strava_url']
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`)
        values.push(body[field])
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Add id to values for WHERE clause
    values.push(id)

    // Update runner
    const result = await db.query(`
      UPDATE runners
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values)

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      )
    }

    // Return updated runner
    const runnerResult = await db.query(`
      SELECT * FROM runners WHERE id = $1
    `, [id])

    return NextResponse.json({
      success: true,
      runner: runnerResult.rows[0]
    })
  } catch (error) {
    console.error('Error updating runner:', error)
    return NextResponse.json(
      { error: 'Failed to update runner' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET team by country code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params

    const result = await pool.query(
      `SELECT * FROM teams WHERE country_code = $1`,
      [country.toUpperCase()]
    )

    if (result.rows.length === 0) {
      // Return empty team if not found
      return NextResponse.json({
        country_code: country.toUpperCase(),
        team_photo_url: null,
        description: null
      })
    }

    return NextResponse.json(result.rows[0])

  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

// PUT update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params
    const { team_photo_url, description } = await request.json()

    // Upsert team (insert or update)
    const result = await pool.query(
      `INSERT INTO teams (country_code, team_photo_url, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (country_code)
       DO UPDATE SET
         team_photo_url = EXCLUDED.team_photo_url,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [country.toUpperCase(), team_photo_url, description]
    )

    return NextResponse.json(result.rows[0])

  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    )
  }
}

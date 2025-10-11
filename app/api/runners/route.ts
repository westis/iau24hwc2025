import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDatabase()

    const result = await db.query('SELECT * FROM runners ORDER BY entry_id')

    const runners = result.rows.map((row: any) => ({
      id: row.id,
      entryId: row.entry_id,
      firstname: row.firstname,
      lastname: row.lastname,
      nationality: row.nationality,
      gender: row.gender,
      dns: row.dns || false,
      duvId: row.duv_id,
      matchStatus: row.match_status,
      matchConfidence: row.match_confidence,
      personalBestAllTime: row.personal_best_all_time,
      personalBestAllTimeYear: row.personal_best_all_time_year,
      personalBestLast3Years: row.personal_best_last_2_years,
      personalBestLast3YearsYear: row.personal_best_last_2_years_year,
      dateOfBirth: row.date_of_birth,
      age: row.age,
    }))

    return NextResponse.json({
      runners,
      count: runners.length,
    })
  } catch (error) {
    console.error('Get runners error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runners', details: String(error) },
      { status: 500 }
    )
  }
}

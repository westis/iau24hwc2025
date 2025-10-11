import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDatabase()

    const result = await db.query('SELECT * FROM runners ORDER BY entry_id')

    // Fetch performances and all_pbs for each runner
    const runnersWithData = await Promise.all(
      result.rows.map(async (row: any) => {
        // Fetch performances
        const perfResult = await db.query(
          'SELECT * FROM performances WHERE runner_id = $1 ORDER BY event_date DESC',
          [row.id]
        )

        const performanceHistory = perfResult.rows.map((perf: any) => ({
          eventId: perf.event_id,
          eventName: perf.event_name,
          date: perf.event_date,
          distance: perf.distance,
          rank: perf.rank,
          eventType: perf.event_type,
        }))

        return {
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
          allPBs: row.all_pbs || [],
          performanceHistory,
        }
      })
    )

    return NextResponse.json({
      runners: runnersWithData,
      count: runnersWithData.length,
    })
  } catch (error) {
    console.error('Get runners error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runners', details: String(error) },
      { status: 500 }
    )
  }
}

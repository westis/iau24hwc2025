import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDatabase()

    // Get all runners without DUV ID (exclude ones marked as 'no-match')
    const runners = db.prepare(`
      SELECT
        r.id,
        r.entry_id,
        r.firstname,
        r.lastname,
        r.nationality,
        r.gender,
        r.match_status
      FROM runners r
      WHERE r.duv_id IS NULL
      AND r.match_status != 'no-match'
      ORDER BY r.lastname, r.firstname
    `).all()

    // For each runner, get their match candidates
    const runnersWithCandidates = runners.map((runner: any) => {
      const candidates = db.prepare(`
        SELECT
          id,
          duv_person_id,
          lastname,
          firstname,
          year_of_birth,
          nation,
          sex,
          personal_best,
          confidence
        FROM match_candidates
        WHERE runner_id = ?
        ORDER BY confidence DESC
      `).all(runner.id)

      return {
        ...runner,
        candidates
      }
    })

    return NextResponse.json({
      runners: runnersWithCandidates,
      count: runnersWithCandidates.length
    })
  } catch (error) {
    console.error('Error fetching unmatched runners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unmatched runners' },
      { status: 500 }
    )
  }
}

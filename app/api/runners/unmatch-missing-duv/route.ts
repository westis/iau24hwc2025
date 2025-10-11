import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const db = getDatabase()

    // Find all runners with match_status but no duv_id
    const runnersResult = await db.query(`
      SELECT id, firstname, lastname, match_status
      FROM runners
      WHERE duv_id IS NULL
      AND match_status != 'unmatched'
    `)
    const runnersWithoutDuvId = runnersResult.rows

    console.log('Found runners without DUV ID:', runnersWithoutDuvId)

    // Unmatch them all
    const result = await db.query(`
      UPDATE runners
      SET match_status = 'unmatched',
          match_confidence = NULL
      WHERE duv_id IS NULL
      AND match_status != 'unmatched'
    `)

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      runners: runnersWithoutDuvId,
    })
  } catch (error) {
    console.error('Error unmatching runners without DUV ID:', error)
    return NextResponse.json(
      { error: 'Failed to unmatch runners', details: String(error) },
      { status: 500 }
    )
  }
}

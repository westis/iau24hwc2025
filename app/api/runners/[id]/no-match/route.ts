import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()

    // Mark runner as no-match (not found in DUV)
    const result = await db.query(`
      UPDATE runners
      SET duv_id = NULL,
          match_status = 'no-match',
          match_confidence = NULL
      WHERE id = $1
    `, [id])

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
    const runner = runnerResult.rows[0]

    return NextResponse.json({
      success: true,
      runner
    })
  } catch (error) {
    console.error('Error marking runner as no-match:', error)
    return NextResponse.json(
      { error: 'Failed to mark as no-match' },
      { status: 500 }
    )
  }
}

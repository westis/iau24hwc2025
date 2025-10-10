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
    const stmt = db.prepare(`
      UPDATE runners
      SET duv_id = NULL,
          match_status = 'no-match',
          match_confidence = NULL
      WHERE id = ?
    `)

    const result = stmt.run(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      )
    }

    // Return updated runner
    const runner = db.prepare(`
      SELECT * FROM runners WHERE id = ?
    `).get(id)

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

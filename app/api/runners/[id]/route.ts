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
    const runner = db.prepare(`
      SELECT * FROM runners WHERE id = ?
    `).get(runnerId)

    if (!runner) {
      return NextResponse.json({ error: 'Runner not found' }, { status: 404 })
    }

    // Get performances for this runner
    const performances = db.prepare(`
      SELECT * FROM performances
      WHERE runner_id = ?
      ORDER BY event_date DESC
    `).all(runnerId)

    return NextResponse.json({
      runner: {
        ...runner,
        performances
      }
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
    const allowedFields = ['firstname', 'lastname', 'nationality', 'gender', 'dns']
    const updates: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
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
    const stmt = db.prepare(`
      UPDATE runners
      SET ${updates.join(', ')}
      WHERE id = ?
    `)

    const result = stmt.run(...values)

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
    console.error('Error updating runner:', error)
    return NextResponse.json(
      { error: 'Failed to update runner' },
      { status: 500 }
    )
  }
}

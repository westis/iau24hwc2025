import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'
import { getRunnerProfile } from '@/lib/api/duv-client'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duvId, confidence = 1.0 } = body

    console.log(`\nManual Match API called:`)
    console.log(`  Runner ID: ${id}`)
    console.log(`  DUV Person ID: ${duvId}`)
    console.log(`  Confidence: ${confidence}`)

    if (!duvId) {
      return NextResponse.json(
        { error: 'DUV ID is required' },
        { status: 400 }
      )
    }

    // Validate that the DUV PersonID exists using the JSON API
    console.log(`  Validating DUV PersonID ${duvId}...`)
    try {
      // Use the working JSON endpoint via duv-client
      await getRunnerProfile(duvId)
      console.log(`  ✓ DUV PersonID ${duvId} is valid`)
    } catch (validateError) {
      console.error(`  ✗ Failed to validate DUV PersonID:`, validateError)
      return NextResponse.json(
        { error: `Invalid DUV PersonID ${duvId} - runner not found in DUV database` },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Update runner with manual match
    const updateResult = await db.query(`
      UPDATE runners
      SET duv_id = $1,
          match_status = 'manually-matched',
          match_confidence = $2
      WHERE id = $3
    `, [duvId, confidence, id])

    if (updateResult.rowCount === 0) {
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
    console.error('Error creating manual match:', error)
    return NextResponse.json(
      { error: 'Failed to create manual match' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()

    // Clear the match
    const result = await db.query(`
      UPDATE runners
      SET duv_id = NULL,
          match_status = 'unmatched',
          match_confidence = NULL
      WHERE id = $1
    `, [id])

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error clearing match:', error)
    return NextResponse.json(
      { error: 'Failed to clear match' },
      { status: 500 }
    )
  }
}

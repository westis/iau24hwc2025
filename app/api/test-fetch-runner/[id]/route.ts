import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()

    // Get the runner from database
    const runnerResult = await db.query('SELECT * FROM runners WHERE id = $1', [id])
    const runner = runnerResult.rows[0] as any

    if (!runner) {
      return NextResponse.json({ error: 'Runner not found' }, { status: 404 })
    }

    console.log('\n' + '='.repeat(60))
    console.log('TEST FETCH for Runner ID:', id)
    console.log('Runner:', JSON.stringify(runner, null, 2))
    console.log('='.repeat(60))

    // Now try to fetch PBs using the same endpoint
    const fetchResponse = await fetch(`${request.nextUrl.origin}/api/fetch-performances-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runners: [{
          id: runner.id,
          entryId: runner.entry_id,
          firstname: runner.firstname,
          lastname: runner.lastname,
          nationality: runner.nationality,
          gender: runner.gender,
          duvId: runner.duv_id,
          matchStatus: runner.match_status,
          matchConfidence: runner.match_confidence,
          personalBestAllTime: runner.personal_best_all_time,
          personalBestLast2Years: runner.personal_best_last_2_years,
          dateOfBirth: runner.date_of_birth,
          age: runner.age
        }]
      })
    })

    const fetchResult = await fetchResponse.json()

    console.log('Fetch result:', fetchResult)
    console.log('='.repeat(60) + '\n')

    // Get updated runner
    const updatedResult = await db.query('SELECT * FROM runners WHERE id = $1', [id])
    const updatedRunner = updatedResult.rows[0] as any

    return NextResponse.json({
      success: true,
      original: runner,
      updated: updatedRunner,
      fetchResponse: fetchResult
    })
  } catch (error) {
    console.error('Test fetch error:', error)
    return NextResponse.json(
      { error: 'Test fetch failed', details: String(error) },
      { status: 500 }
    )
  }
}

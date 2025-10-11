import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDatabase()

    // Get a runner to test with
    const runnerResult = await db.query('SELECT * FROM runners LIMIT 1')
    const runner = runnerResult.rows[0] as any

    if (!runner) {
      return NextResponse.json({ error: 'No runners found in database' }, { status: 404 })
    }

    console.log('Test: Found runner:', runner)

    // Try to update the runner with a test value
    const testAge = 99
    console.log(`Test: Attempting to set age to ${testAge} for entry_id ${runner.entry_id}`)

    const updateResult = await db.query('UPDATE runners SET age = $1 WHERE entry_id = $2', [testAge, runner.entry_id])

    console.log(`Test: Update result - changes: ${updateResult.rowCount}`)

    // Read it back
    const verifyResult = await db.query('SELECT age FROM runners WHERE entry_id = $1', [runner.entry_id])
    const verifyRunner = verifyResult.rows[0] as any
    console.log(`Test: Verified age after update:`, verifyRunner.age)

    // Reset it
    await db.query('UPDATE runners SET age = $1 WHERE entry_id = $2', [runner.age, runner.entry_id])

    return NextResponse.json({
      success: true,
      message: 'Database write test completed',
      originalAge: runner.age,
      testAge: testAge,
      verifiedAge: verifyRunner.age,
      updateChanges: updateResult.rowCount
    })
  } catch (error) {
    console.error('Database write test error:', error)
    return NextResponse.json(
      { error: 'Database write test failed', details: String(error) },
      { status: 500 }
    )
  }
}

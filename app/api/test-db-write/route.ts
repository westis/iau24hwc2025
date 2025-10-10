import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDatabase()

    // Get a runner to test with
    const runner = db.prepare('SELECT * FROM runners LIMIT 1').get() as any

    if (!runner) {
      return NextResponse.json({ error: 'No runners found in database' }, { status: 404 })
    }

    console.log('Test: Found runner:', runner)

    // Try to update the runner with a test value
    const testAge = 99
    console.log(`Test: Attempting to set age to ${testAge} for entry_id ${runner.entry_id}`)

    const updateStmt = db.prepare('UPDATE runners SET age = ? WHERE entry_id = ?')
    const updateResult = updateStmt.run(testAge, runner.entry_id)

    console.log(`Test: Update result - changes: ${updateResult.changes}`)

    // Read it back
    const verifyRunner = db.prepare('SELECT age FROM runners WHERE entry_id = ?').get(runner.entry_id) as any
    console.log(`Test: Verified age after update:`, verifyRunner.age)

    // Reset it
    const resetStmt = db.prepare('UPDATE runners SET age = ? WHERE entry_id = ?')
    resetStmt.run(runner.age, runner.entry_id)

    return NextResponse.json({
      success: true,
      message: 'Database write test completed',
      originalAge: runner.age,
      testAge: testAge,
      verifiedAge: verifyRunner.age,
      updateChanges: updateResult.changes
    })
  } catch (error) {
    console.error('Database write test error:', error)
    return NextResponse.json(
      { error: 'Database write test failed', details: String(error) },
      { status: 500 }
    )
  }
}

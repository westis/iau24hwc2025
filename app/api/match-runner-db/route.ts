// app/api/match-runner-db/route.ts - Auto-match runner with database persistence
import { NextRequest, NextResponse } from 'next/server'
import { autoMatchRunner } from '@/lib/matching/matcher'
import { updateRunner, insertMatchCandidates, getRunnerByEntryId } from '@/lib/db/database'
import type { Runner } from '@/types/runner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { runner } = body as { runner: Runner }

    if (!runner || !runner.entryId) {
      return NextResponse.json(
        { error: 'Invalid runner data' },
        { status: 400 }
      )
    }

    // Auto-match using existing algorithm
    const matchResult = await autoMatchRunner(runner)

    // Save match candidates to database
    const dbRunner = getRunnerByEntryId(runner.entryId)
    if (dbRunner) {
      const runnerId = dbRunner.entryId // We'll use entry_id as lookup

      // If auto-matched, update runner in database
      if (matchResult.selectedDuvId) {
        const candidate = matchResult.candidates.find(c => c.PersonID === matchResult.selectedDuvId)
        updateRunner(runner.entryId, {
          duvId: matchResult.selectedDuvId,
          matchStatus: 'auto-matched',
          matchConfidence: candidate?.confidence,
        })
      }

      // Save candidates for manual review
      if (matchResult.candidates.length > 0) {
        // Get runner ID from database
        const { getDatabase } = await import('@/lib/db/database')
        const db = getDatabase()
        const runnerRow = db.prepare('SELECT id FROM runners WHERE entry_id = ?').get(runner.entryId) as any

        if (runnerRow) {
          insertMatchCandidates(runnerRow.id, matchResult.candidates)
        }
      }
    }

    return NextResponse.json(matchResult)
  } catch (error) {
    console.error('Match runner error:', error)
    return NextResponse.json(
      { error: 'Failed to match runner', details: String(error) },
      { status: 500 }
    )
  }
}

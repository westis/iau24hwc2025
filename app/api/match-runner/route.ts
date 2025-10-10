// app/api/match-runner/route.ts - Single Runner Matching API Route
import { NextRequest, NextResponse } from 'next/server'
import { autoMatchRunner } from '@/lib/matching/matcher'
import type { Runner } from '@/types/runner'

/**
 * POST /api/match-runner
 *
 * Accepts a single runner and attempts auto-matching via DUV API.
 * Returns MatchCandidate with confidence scores.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const runner = body.runner as Runner

    // Validate required fields
    if (!runner || !runner.firstname || !runner.lastname || !runner.gender) {
      return NextResponse.json(
        { error: 'Invalid runner data. Required fields: firstname, lastname, gender' },
        { status: 400 }
      )
    }

    // Perform auto-matching
    const matchResult = await autoMatchRunner(runner)

    return NextResponse.json({
      runner: matchResult.runner,
      candidates: matchResult.candidates,
      selectedDuvId: matchResult.selectedDuvId,
      autoMatched: !!matchResult.selectedDuvId,
    })

  } catch (error) {
    console.error('Match runner error:', error)
    return NextResponse.json(
      { error: 'Failed to match runner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

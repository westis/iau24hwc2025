import { NextRequest, NextResponse } from 'next/server'
import { getRunnerNotes, createRunnerNote } from '@/lib/db/database'
import type { RunnerNoteCreate } from '@/types/runner-note'

export const dynamic = 'force-dynamic'

// GET /api/runners/[id]/notes - Get all notes for a runner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const runnerId = parseInt(id)
    if (isNaN(runnerId)) {
      return NextResponse.json(
        { error: 'Invalid runner ID' },
        { status: 400 }
      )
    }

    const notes = await getRunnerNotes(runnerId)

    return NextResponse.json({
      notes,
      count: notes.length,
    })
  } catch (error) {
    console.error('Get runner notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runner notes', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/runners/[id]/notes - Create a new note for a runner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const runnerId = parseInt(id)
    if (isNaN(runnerId)) {
      return NextResponse.json(
        { error: 'Invalid runner ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate: must have at least noteText or newsId
    if (!body.noteText && !body.newsId) {
      return NextResponse.json(
        { error: 'Must provide either noteText or newsId' },
        { status: 400 }
      )
    }

    const noteCreate: RunnerNoteCreate = {
      runnerId,
      noteText: body.noteText,
      newsId: body.newsId,
    }

    const note = await createRunnerNote(noteCreate)

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Create runner note error:', error)
    return NextResponse.json(
      { error: 'Failed to create runner note', details: String(error) },
      { status: 500 }
    )
  }
}

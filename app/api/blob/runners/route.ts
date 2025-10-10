// app/api/blob/runners/route.ts - Vercel Blob storage for runners data
import { NextRequest, NextResponse } from 'next/server'
import { loadRunnersFromBlob, saveRunnersToBlob } from '@/lib/blob/blob-storage'

/**
 * GET /api/blob/runners
 * Returns runners from Vercel Blob storage, or from seed.json if blob doesn't exist
 */
export async function GET(request: NextRequest) {
  try {
    const data = await loadRunnersFromBlob()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error loading runners:', error)
    return NextResponse.json(
      { error: 'Failed to load runners', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/blob/runners
 * Updates runners in Vercel Blob storage
 */
export async function PUT(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { runners, version } = body

    if (!Array.isArray(runners)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected runners array.' },
        { status: 400 }
      )
    }

    const url = await saveRunnersToBlob(runners, version)

    return NextResponse.json({
      success: true,
      url,
      count: runners.length,
    })

  } catch (error) {
    console.error('Error uploading to blob:', error)
    return NextResponse.json(
      { error: 'Failed to upload runners', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

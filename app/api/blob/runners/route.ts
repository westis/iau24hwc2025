// app/api/blob/runners/route.ts - Vercel Blob storage for runners data
import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import type { Runner } from '@/types/runner'
import seedData from '@/data/seed-data.json'

const BLOB_NAME = 'runners.json'

/**
 * GET /api/blob/runners
 * Returns runners from Vercel Blob storage, or from seed.json if blob doesn't exist
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get from Vercel Blob first
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await head(BLOB_NAME, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })

        if (blob) {
          const response = await fetch(blob.url)
          const data = await response.json()
          console.log(`Loaded ${data.runners?.length || 0} runners from Vercel Blob`)
          return NextResponse.json(data)
        }
      } catch (blobError) {
        console.log('Blob not found or error, falling back to seed.json:', blobError)
      }
    }

    // Fallback to imported seed data
    console.log('Loading runners from seed-data.json (blob not available)')

    return NextResponse.json({
      runners: (seedData as any).runners,
      version: (seedData as any).version,
      source: 'seed-data.json'
    })

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

    // Upload to Vercel Blob
    const blob = await put(BLOB_NAME, JSON.stringify({ runners, version, updatedAt: new Date().toISOString() }), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log(`✓ Uploaded ${runners.length} runners to Vercel Blob at ${blob.url}`)

    return NextResponse.json({
      success: true,
      url: blob.url,
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

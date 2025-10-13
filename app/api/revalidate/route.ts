import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// POST /api/revalidate - Trigger on-demand revalidation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paths, tags } = body

    // Revalidate specified paths
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path)
      }
    }

    // Revalidate specified tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag)
      }
    }

    return NextResponse.json({
      success: true,
      revalidated: { paths, tags },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    )
  }
}

// GET /api/revalidate - Show revalidation info
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger revalidation',
    usage: {
      paths: 'Array of paths to revalidate (e.g., ["/", "/participants", "/loppet"])',
      tags: 'Array of cache tags to revalidate',
    },
    example: {
      paths: ['/', '/participants', '/loppet', '/news'],
      tags: ['runners', 'race', 'news'],
    },
  })
}

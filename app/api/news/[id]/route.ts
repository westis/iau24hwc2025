import { NextRequest, NextResponse } from 'next/server'
import { getNewsById, updateNews, deleteNews, linkRunnersToNews, getRunnersByNewsId } from '@/lib/db/database'
import type { NewsItemUpdate } from '@/types/news'

export const dynamic = 'force-dynamic'

// GET /api/news/[id] - Get specific news item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return NextResponse.json(
        { error: 'Invalid news ID' },
        { status: 400 }
      )
    }

    const news = await getNewsById(newsId)

    if (!news) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      )
    }

    // Get linked runner IDs
    news.linkedRunnerIds = await getRunnersByNewsId(newsId)

    return NextResponse.json(news)
  } catch (error) {
    console.error('Get news by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/news/[id] - Update news item (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return NextResponse.json(
        { error: 'Invalid news ID' },
        { status: 400 }
      )
    }

    const body = await request.json() as NewsItemUpdate

    const news = await updateNews(newsId, body)

    if (!news) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      )
    }

    // Update linked runners if provided
    if (body.runnerIds !== undefined) {
      await linkRunnersToNews(newsId, body.runnerIds)
      news.linkedRunnerIds = body.runnerIds
    } else {
      news.linkedRunnerIds = await getRunnersByNewsId(newsId)
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('Update news error:', error)
    return NextResponse.json(
      { error: 'Failed to update news', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/news/[id] - Delete news item (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return NextResponse.json(
        { error: 'Invalid news ID' },
        { status: 400 }
      )
    }

    const success = await deleteNews(newsId)

    if (!success) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'News deleted successfully' })
  } catch (error) {
    console.error('Delete news error:', error)
    return NextResponse.json(
      { error: 'Failed to delete news', details: String(error) },
      { status: 500 }
    )
  }
}

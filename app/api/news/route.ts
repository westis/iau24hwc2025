import { NextRequest, NextResponse } from 'next/server'
import { getNews, createNews } from '@/lib/db/database'
import type { NewsItemCreate } from '@/types/news'

export const dynamic = 'force-dynamic'

// GET /api/news - Get all news (published only by default, or all for admins)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'

    const news = await getNews(!includeUnpublished)

    return NextResponse.json({
      news,
      count: news.length,
    })
  } catch (error) {
    console.error('Get news error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/news - Create new news item (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as NewsItemCreate

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const news = await createNews(body)

    return NextResponse.json(news, { status: 201 })
  } catch (error) {
    console.error('Create news error:', error)
    return NextResponse.json(
      { error: 'Failed to create news', details: String(error) },
      { status: 500 }
    )
  }
}

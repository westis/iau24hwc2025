// app/api/race/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getActiveRaceInfo } from '@/lib/db/database'

// Enable ISR: revalidate every 5 minutes (race info changes less frequently)
export const revalidate = 300

// GET /api/race - Get active race information
export async function GET(request: NextRequest) {
  try {
    const raceInfo = await getActiveRaceInfo()

    if (!raceInfo) {
      return NextResponse.json(
        { error: 'No active race found' },
        { status: 404 }
      )
    }

    return NextResponse.json(raceInfo, {
      headers: {
        // Cache for 5 minutes, serve stale for 10 minutes while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching race info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch race information' },
      { status: 500 }
    )
  }
}

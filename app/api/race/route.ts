// app/api/race/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getActiveRaceInfo } from '@/lib/db/database'

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

    return NextResponse.json(raceInfo)
  } catch (error) {
    console.error('Error fetching race info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch race information' },
      { status: 500 }
    )
  }
}

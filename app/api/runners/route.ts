import { NextResponse } from 'next/server'
import { getRunners } from '@/lib/db/database'

// Enable ISR: revalidate every 60 seconds
export const revalidate = 60

export async function GET() {
  try {
    const runners = await getRunners()

    return NextResponse.json(
      {
        runners,
        count: runners.length,
      },
      {
        headers: {
          // Cache for 60 seconds, serve stale for 120 seconds while revalidating
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Get runners error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runners', details: String(error) },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getRunners } from '@/lib/db/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const runners = await getRunners()

    return NextResponse.json({
      runners,
      count: runners.length,
    })
  } catch (error) {
    console.error('Get runners error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch runners', details: String(error) },
      { status: 500 }
    )
  }
}

// app/api/teams/route.ts - Get team rankings from database
import { NextRequest, NextResponse } from 'next/server'
import { getTeams, calculateAndSaveTeams } from '@/lib/db/database'
import type { Gender } from '@/types/runner'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = (searchParams.get('metric') || 'all-time') as 'all-time' | 'last-3-years'
    const gender = (searchParams.get('gender') || 'M') as Gender

    // Calculate and save team rankings
    await calculateAndSaveTeams(metric)

    // Get teams
    const teams = await getTeams(metric, gender)

    return NextResponse.json({
      teams,
      count: teams.length,
      metric,
      gender,
    })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team rankings', details: String(error) },
      { status: 500 }
    )
  }
}

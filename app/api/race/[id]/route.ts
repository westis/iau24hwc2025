import { NextRequest, NextResponse } from 'next/server'
import { updateRaceInfo, getRaceInfoById } from '@/lib/db/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const raceId = parseInt(id)

    if (isNaN(raceId)) {
      return NextResponse.json({ error: 'Invalid race ID' }, { status: 400 })
    }

    const raceInfo = await getRaceInfoById(raceId)

    if (!raceInfo) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    return NextResponse.json(raceInfo)
  } catch (error) {
    console.error('Error fetching race info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const raceId = parseInt(id)

    if (isNaN(raceId)) {
      return NextResponse.json({ error: 'Invalid race ID' }, { status: 400 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.raceNameEn || !body.raceNameSv || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: raceNameEn, raceNameSv, startDate' },
        { status: 400 }
      )
    }

    const updatedRace = await updateRaceInfo(raceId, {
      raceNameEn: body.raceNameEn,
      raceNameSv: body.raceNameSv,
      descriptionEn: body.descriptionEn || null,
      descriptionSv: body.descriptionSv || null,
      startDate: body.startDate,
      endDate: body.endDate || null,
      locationName: body.locationName || null,
      locationAddress: body.locationAddress || null,
      liveResultsUrl: body.liveResultsUrl || null,
      registrationUrl: body.registrationUrl || null,
      officialWebsiteUrl: body.officialWebsiteUrl || null,
      courseMapUrl: body.courseMapUrl || null,
      heroImageUrl: body.heroImageUrl || null,
      rulesEn: body.rulesEn || null,
      rulesSv: body.rulesSv || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
    })

    if (!updatedRace) {
      return NextResponse.json({ error: 'Failed to update race' }, { status: 500 })
    }

    return NextResponse.json(updatedRace)
  } catch (error) {
    console.error('Error updating race info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

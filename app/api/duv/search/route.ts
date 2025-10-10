import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DUV_API_BASE = 'https://statistik.d-u-v.org/json'

// Normalize string for DUV API search (remove diacritics but keep Nordic åäöæø)
function normalizeForSearch(s: string): string {
  // For simplicity in TypeScript, we'll just pass through
  // The Python script has complex Nordic character handling
  // For the web UI, we'll just trim and pass through
  return s.trim()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lastname = searchParams.get('lastname') || ''
  const firstname = searchParams.get('firstname') || ''
  const gender = searchParams.get('gender') || ''
  const nationality = searchParams.get('nationality') || ''

  if (!lastname) {
    return NextResponse.json(
      { error: 'Lastname is required' },
      { status: 400 }
    )
  }

  try {
    const url = new URL(`${DUV_API_BASE}/msearchrunner.php`)

    // Add search parameters
    const normalizedLastname = normalizeForSearch(lastname)
    const normalizedFirstname = normalizeForSearch(firstname)

    url.searchParams.append('sname', normalizedLastname)
    if (normalizedFirstname) {
      url.searchParams.append('fname', normalizedFirstname)
    }
    if (nationality) {
      url.searchParams.append('nat', nationality)
    }

    // Fetch from DUV API (disable SSL verification as DUV has certificate issues)
    const response = await fetch(url.toString(), {
      // Note: fetch in Node.js doesn't support rejectUnauthorized option directly
      // We need to use a custom agent for that, but for now we'll try without
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`DUV API error: ${response.status}`)
    }

    const data = await response.json()
    let hitlist = data.Hitlist || []

    // Log what we got from DUV
    console.log(`\nDUV Search for: ${normalizedLastname} ${normalizedFirstname}`)
    console.log(`Found ${hitlist.length} results`)
    if (hitlist.length > 0) {
      console.log(`First result:`, JSON.stringify(hitlist[0], null, 2))
    }

    // Filter by gender if provided
    if (gender && hitlist.length > 0) {
      hitlist = hitlist.filter((runner: any) => runner.Gender === gender)
    }

    return NextResponse.json({
      results: hitlist,
      count: hitlist.length
    })
  } catch (error) {
    console.error('Error searching DUV:', error)
    return NextResponse.json(
      { error: 'Failed to search DUV API' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// OAuth callback endpoint for Strava
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json(
      { error: `Strava authorization error: ${error}` },
      { status: 400 }
    )
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      return NextResponse.json(
        { error: 'Failed to exchange code for token', details: errorData },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()

    // Return tokens in a user-friendly format
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <title>Strava OAuth Success</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #FC4C02; }
    .token-box {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 10px 0;
    }
    .success { color: #22c55e; }
    .label { font-weight: bold; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Strava Authorization Successful!</h1>
    <p>Your access token has been generated. Add these to your <code>.env.local</code> and Vercel environment variables:</p>

    <div class="label">STRAVA_ACCESS_TOKEN:</div>
    <div class="token-box">${tokenData.access_token}</div>

    <div class="label">STRAVA_REFRESH_TOKEN:</div>
    <div class="token-box">${tokenData.refresh_token}</div>

    <div class="label">Athlete Info:</div>
    <div class="token-box">
ID: ${tokenData.athlete.id}<br>
Name: ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}<br>
Expires At: ${new Date(tokenData.expires_at * 1000).toLocaleString()}
    </div>

    <p style="margin-top: 30px;">
      <strong>Next steps:</strong><br>
      1. Update STRAVA_ACCESS_TOKEN in your .env.local file<br>
      2. Update STRAVA_REFRESH_TOKEN in your .env.local file<br>
      3. Add both to Vercel environment variables<br>
      4. Redeploy or restart your dev server
    </p>
  </div>
</body>
</html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process OAuth callback',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

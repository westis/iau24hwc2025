import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { title, message, url, scheduleTime } = await request.json()

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY

    // Check if OneSignal is configured
    if (!appId) {
      return NextResponse.json(
        { error: 'OneSignal App ID not configured' },
        { status: 500 }
      )
    }

    if (!restApiKey) {
      return NextResponse.json(
        { error: 'OneSignal REST API Key not configured. Get it from OneSignal Dashboard > Settings > Keys & IDs' },
        { status: 500 }
      )
    }

    // Build OneSignal notification payload
    const notificationPayload: any = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      url: url || undefined,
      included_segments: ['All'] // Send to all subscribers
    }

    // Add schedule time if provided (OneSignal's send_after parameter)
    if (scheduleTime) {
      notificationPayload.send_after = scheduleTime
    }

    // Send notification to OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`
      },
      body: JSON.stringify(notificationPayload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OneSignal API error:', data)
      return NextResponse.json(
        { error: 'Failed to send notification', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      notificationId: data.id,
      recipients: data.recipients
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

# OneSignal Setup Instructions

This guide will help you set up web push notifications using OneSignal.

## 1. Create OneSignal Account

1. Go to [OneSignal.com](https://onesignal.com)
2. Sign up for a free account
3. Click "New App/Website"
4. Choose "Web Push" as the platform

## 2. Configure Web Push

1. **App Name**: Enter "IAU 24h World Championships 2025"
2. **Choose Configuration**:
   - Select "Typical Site" (unless you have a Progressive Web App)
3. **Site Setup**:
   - Site URL: `https://iau24hwc2025.ultramarathon.se`
   - For local development, you can add: `http://localhost:3000`
4. **Choose Integration**: Select "Custom Code" or "Vanilla JavaScript"

## 3. Get Your App ID

After setup, you'll see a dashboard with your **App ID**. It looks like:
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Copy this App ID - you'll need it for the next step.

## 4. Get Your REST API Key

To send notifications from the admin panel, you need the REST API Key:

1. In OneSignal dashboard, go to **Settings → Keys & IDs**
2. Under "REST API Key", copy the key (starts with `Basic...` or `OS...`)
3. Keep this key secret - it has full access to send notifications!

## 5. Configure Environment Variables

### Local Development

1. Open `.env.local` in your project root
2. Replace the placeholders with your actual keys:
   ```env
   NEXT_PUBLIC_ONESIGNAL_APP_ID=b6b6c180-92d4-43c9-b425-724d0c0113ed
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to: **Settings → Environment Variables**
3. Add these variables:
   - **Key**: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - **Value**: `b6b6c180-92d4-43c9-b425-724d0c0113ed`
   - **Environment**: Production, Preview, Development (all)

   - **Key**: `ONESIGNAL_REST_API_KEY`
   - **Value**: Your REST API Key from OneSignal
   - **Environment**: Production, Preview, Development (all)
4. Click "Save"
5. Redeploy your app for changes to take effect

## 6. Test Notifications

1. Visit your site (locally or on Vercel)
2. Click the bell icon in the navbar to subscribe
3. The browser will show a permission prompt
4. Accept the prompt to enable notifications

## 7. Send Test Notification

### From OneSignal Dashboard:

1. Go to **Messages → Push**
2. Click "New Push"
3. Enter a message:
   - **Title**: "Test Notification"
   - **Message**: "Your push notifications are working!"
4. Click "Send to All Subscribers"

You should receive the notification even if your browser tab is closed!

### From Admin Panel:

Once you've added the REST API Key, you can send notifications from the app:

1. Go to **Admin → Send Notifications** in the navbar
2. Enter title and message
3. Optionally add a URL to open when clicked
4. Choose delivery timing:
   - **Send immediately**: Notification is sent right away
   - **Schedule for later**: Select a date and time for the notification
5. Click "Send Notification"

**Scheduled Notifications:**
- Select date and time in your local timezone
- OneSignal will automatically deliver at the scheduled time
- Time validation ensures you can't schedule in the past
- View scheduled notifications in OneSignal dashboard

## 8. Sending Notifications with News

When creating or editing news articles:

1. Check "Published" to make it visible
2. Check "Send push notification" to notify all subscribers
3. The notification will include the news title and a preview of the content
4. Clicking the notification will open the news article

## Platform-Specific Behavior

### Desktop (Chrome, Firefox, Edge, Safari)
✅ Full support - notifications work even when browser is closed

### Android Chrome
✅ Full support - works like native push notifications

### iOS Safari
⚠️ Limited support:
- Requires browser to be open OR site added to home screen
- iOS 16.4+ has better support
- Consider promoting "Add to Home Screen" for iOS users

## Troubleshooting

**Button doesn't appear:**
- Check that `NEXT_PUBLIC_ONESIGNAL_APP_ID` is set correctly
- Make sure it's not the placeholder value
- Check browser console for errors

**Notifications not received:**
- Verify you're subscribed (button should show "Unsubscribe")
- Check OneSignal dashboard shows subscribers
- Test from OneSignal dashboard first

**Works locally but not on Vercel:**
- Ensure environment variable is set in Vercel
- Redeploy after adding the variable
- Check production URL is added in OneSignal site settings

## Managing Scheduled Notifications

You can view and manage scheduled notifications in the OneSignal dashboard:

1. Go to **Messages → Push** in OneSignal dashboard
2. Click the **Scheduled** tab to see all pending notifications
3. You can:
   - View when each notification will be sent
   - Edit the scheduled time
   - Cancel scheduled notifications if needed
   - See the notification content and recipients

**Note:** Scheduled times are converted to UTC by OneSignal, so the dashboard may show a different time than your local timezone.

## Next Steps

- Test notifications by subscribing via the bell icon in the navbar
- Set up automatic notifications when news is published (checkbox in news admin)
- Schedule important notifications in advance (race start reminders, etc.)
- Create targeted notifications for specific teams/countries using OneSignal segments
- Use tags to segment users by interests

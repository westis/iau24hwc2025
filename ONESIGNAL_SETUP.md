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

## 4. Configure Environment Variables

### Local Development

1. Open `.env.local` in your project root
2. Replace the placeholder with your actual App ID:
   ```env
   NEXT_PUBLIC_ONESIGNAL_APP_ID=your-actual-app-id-here
   ```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to: **Settings → Environment Variables**
3. Add a new variable:
   - **Key**: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - **Value**: Your OneSignal App ID
   - **Environment**: Production, Preview, Development (select all)
4. Click "Save"
5. Redeploy your app for changes to take effect

## 5. Test Notifications

1. Visit your site (locally or on Vercel)
2. You should see a "Subscribe to Updates" button (you can add this to any page)
3. Click the button to subscribe
4. The browser will show a permission prompt
5. Accept the prompt to enable notifications

## 6. Send Test Notification

From your OneSignal dashboard:

1. Go to **Messages → Push**
2. Click "New Push"
3. Enter a message:
   - **Title**: "Test Notification"
   - **Message**: "Your push notifications are working!"
4. Click "Send to All Subscribers"

You should receive the notification even if your browser tab is closed!

## 7. Using the Subscribe Button

Add the button to any page:

```tsx
import { NotificationSubscribeButton } from '@/components/NotificationSubscribeButton'

export default function YourPage() {
  return (
    <div>
      <NotificationSubscribeButton />
    </div>
  )
}
```

## 8. Sending Notifications from Admin Panel

You can integrate notification sending into your admin panel. Example API usage:

```typescript
// Example: Send notification when creating news
const response = await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic YOUR_REST_API_KEY'
  },
  body: JSON.stringify({
    app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    headings: { en: "New Article" },
    contents: { en: "Check out the latest news!" },
    included_segments: ["All"]
  })
})
```

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

## Next Steps

- Add the subscribe button to your navbar or home page
- Set up automatic notifications when news is published
- Create targeted notifications for specific teams/countries
- Use tags to segment users by interests

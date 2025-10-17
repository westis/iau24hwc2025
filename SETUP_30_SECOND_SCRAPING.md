# Setup 30-Second Scraping

## Why 30 Seconds?

**Vercel Cron limitation**: Minimum interval is 1 minute (60 seconds)

**Your requirement**: Get data updates every 30 seconds for faster crew notifications

**Solution**: Use a free external cron service to ping your endpoint every 30 seconds

---

## Step-by-Step Setup (Using cron-job.org)

### 1. Verify Your Endpoint Works

Test that your cron endpoint responds correctly:

```bash
curl -X GET https://your-app.vercel.app/api/cron/fetch-race-data \
  -H "Authorization: Bearer 534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba"
```

**Expected response**:
```json
{
  "success": true,
  "runnersUpdated": 150,
  "lapsInserted": 12,
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### 2. Sign Up for cron-job.org

1. Go to https://cron-job.org/en/
2. Create free account (no credit card required)
3. Verify email address
4. Log in to dashboard

### 3. Create a New Cron Job

**In cron-job.org dashboard:**

1. Click "Cronjobs" → "Create cronjob"
2. Fill in details:

   **Title**: `IAU 24H Live Race Data Fetch`

   **Address**: `https://your-app.vercel.app/api/cron/fetch-race-data`

   **Schedule**:
   - Pattern: `Every 30 seconds`
   - Or custom: `*/30 * * * *` (every 30 seconds)

   **Request method**: `GET`

   **Headers**: Click "Add header"
   - Header name: `Authorization`
   - Header value: `Bearer 534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba`

   **Timezone**: `Europe/Stockholm` (or your race location)

   **Notifications**:
   - Enable "On failure" (get email if job fails)
   - Enable "On success" (optional, for testing)

3. Click "Create cronjob"

### 4. Test the Cron Job

1. In cron-job.org dashboard, find your new job
2. Click "Execute now" button
3. Wait 5 seconds
4. Click "History" tab
5. Verify response shows 200 OK with success message

**If you see 401 Unauthorized**:
- Check the Authorization header is correct
- Verify CRON_SECRET matches in Vercel environment variables

**If you see 404 Not Found**:
- Check the URL is correct
- Verify deployment is successful

### 5. Disable Vercel Cron (Optional but Recommended)

Since you're using external cron now, you can disable Vercel's cron to avoid duplicate requests:

**Option A: Comment out in vercel.json**
```json
{
  "crons": [
    // {
    //   "path": "/api/cron/fetch-race-data",
    //   "schedule": "* * * * *"
    // }
  ]
}
```

**Option B: Remove entirely**
```json
{
  "crons": []
}
```

**Then redeploy:**
```bash
git add vercel.json
git commit -m "Disable Vercel cron (using external cron-job.org)"
git push
```

---

## Monitoring & Verification

### Check cron-job.org Execution History

1. Go to cron-job.org dashboard
2. Click on your cronjob
3. View "History" tab
4. Should show executions every 30 seconds with 200 OK status

### Check Your Admin Monitoring Page

1. Go to: https://your-app.vercel.app/admin/monitoring
2. "Last Fetch" should update every 30 seconds
3. "Seconds Since Fetch" should never exceed 45-50 seconds

### Check Supabase Database

```sql
-- Should show timestamp within last 30 seconds
SELECT
  last_data_fetch,
  EXTRACT(EPOCH FROM (NOW() - last_data_fetch)) as seconds_since_fetch
FROM race_config
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);
```

---

## Troubleshooting

### Cron Job Shows "Failed"

**Check execution log** in cron-job.org:
- Click on failed execution
- View response body and status code
- Common issues:
  - 401: Authorization header missing or incorrect
  - 404: URL wrong or deployment failed
  - 500: Server error (check Vercel logs)

### Database Not Updating

1. **Check race state**:
   ```bash
   curl https://your-app.vercel.app/api/race/config | jq '.race_state'
   ```
   - Should be `"live"`, not `"pre-race"` or `"paused"`

2. **Check Breizh Chrono URL**:
   ```bash
   curl https://your-app.vercel.app/api/race/config | jq '.data_source'
   ```
   - Should show the Breizh Chrono URL
   - Test it manually: `curl https://breizh-chrono-url`

3. **Check Vercel logs**:
   ```bash
   vercel logs --follow
   ```
   - Look for errors from `/api/cron/fetch-race-data`

### Too Many Requests (Rate Limiting)

**If Breizh Chrono blocks you**:
1. In cron-job.org, change schedule to every minute: `* * * * *`
2. Contact Breizh Chrono to ask about acceptable request rate
3. Adjust schedule based on their response

---

## Race Day Checklist

**1 Day Before Race:**
- ✅ Verify cron-job.org cronjob is active and working
- ✅ Test manual execution shows success
- ✅ Check execution history shows regular pings
- ✅ Confirm admin monitoring page shows updates

**Race Morning (2 hours before):**
- ✅ Set race state to "live"
- ✅ Verify cron-job.org starts receiving 200 OK responses
- ✅ Check admin monitoring page shows data updating every 30s
- ✅ Open live map/countdown pages and verify runner data appears

**During Race:**
- ✅ Monitor cron-job.org history for failures
- ✅ Check admin monitoring page periodically
- ✅ If failures occur, check Vercel logs and Breizh Chrono URL

**After Race:**
- ✅ Set race state to "finished"
- ✅ Verify cron-job.org stops receiving success responses (expected)
- ✅ Optionally disable cron job in cron-job.org to save quota

---

## Alternative Services (If cron-job.org has issues)

### 1. EasyCron (https://www.easycron.com/)
- Free tier: 100 executions/day
- Setup: Similar to cron-job.org
- Schedule: `*/30 * * * *` (every 30 seconds)

### 2. Uptime Robot (https://uptimerobot.com/)
- Free tier: 50 monitors
- Setup: Create HTTP monitor
- Interval: Minimum 30 seconds (paid) / 1 minute (free)
- **Limitation**: Free tier only supports 5-minute minimum

### 3. Render Cron Jobs (https://render.com/)
- Free tier with limitations
- Setup: Similar to Vercel but supports shorter intervals
- Schedule: `*/30 * * * *`

---

## Cost Comparison

| Service | Free Tier | 30-Second Interval | Cost |
|---------|-----------|-------------------|------|
| **cron-job.org** | Unlimited | ✅ Yes | **FREE** |
| **EasyCron** | 100/day | ✅ Yes | FREE (limited) |
| **Render** | 750 hours/month | ✅ Yes | FREE |
| **Uptime Robot** | 50 monitors | ❌ No (5min min) | FREE |

**Recommendation**: Use **cron-job.org** - it's free, reliable, and supports 30-second intervals.

---

## Summary

1. ✅ Create account at cron-job.org
2. ✅ Create cronjob pointing to your endpoint with Authorization header
3. ✅ Set schedule to every 30 seconds
4. ✅ Test execution works (200 OK)
5. ✅ Disable Vercel cron (optional)
6. ✅ Monitor via admin dashboard
7. ✅ Set race state to "live" on race day

**Result**: Your app will fetch data from Breizh Chrono every 30 seconds, giving crews near real-time updates (max 30s delay) instead of 60s with Vercel Cron alone!

---

## Frequently Asked Questions

**Q: Is 30 seconds too aggressive? Will Breizh Chrono block us?**

A: It depends on their server capacity and policies:
- 30s = 120 requests/hour = 2,880 requests/day
- For a 24h race, this is very light traffic
- However, **contact them first** to confirm it's acceptable
- They may prefer 60s or even 2 minutes

**Q: What if the free tier runs out?**

A: Cron-job.org free tier is unlimited, so this shouldn't happen. If it does, switch to EasyCron or Render.

**Q: Can I use multiple services as backup?**

A: Yes, but be careful not to overwhelm your database with duplicate requests. If using multiple:
- Set different intervals (e.g., primary every 30s, backup every 60s)
- Monitor for duplicate data inserts

**Q: What happens if the cron job fails?**

A:
- cron-job.org will send you an email notification
- Previous data remains visible to users
- System continues to work with stale data
- Fix the issue and the next execution will succeed

**Q: Is this secure?**

A: Yes:
- Authorization header with secret token protects endpoint
- HTTPS encryption for all requests
- Only your endpoint can process the authenticated request
- Secret is not exposed in cron-job.org UI

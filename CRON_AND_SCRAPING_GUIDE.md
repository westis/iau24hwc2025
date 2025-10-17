# Cron Job and Data Scraping Guide

## Overview

This application uses **Vercel Cron Jobs** to fetch live race data from external timing systems and **client-side polling** for real-time UI updates.

## Architecture

```
External Timing System (Breizh Chrono)
         ↓
    Vercel Cron (every 1 minute)
         ↓
    Database (Supabase)
         ↓
    API Routes
         ↓
    Client Polling (2-10 seconds)
         ↓
    UI Components
```

---

## Vercel Cron Configuration

### Location
`vercel.json` in project root

### Current Setup
```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-race-data",
      "schedule": "* * * * *"
    }
  ]
}
```

- **Schedule**: `* * * * *` (every minute)
- **Endpoint**: `/app/api/cron/fetch-race-data/route.ts`
- **Runtime**: Edge (fast, globally distributed)

### How It Works

1. **Vercel automatically** calls the cron endpoint at the scheduled interval
2. **Authorization**: Vercel adds `Authorization: Bearer ${CRON_SECRET}` header automatically
3. **The endpoint**:
   - Checks if race is "live"
   - Fetches data from configured data source (Breizh Chrono URL)
   - Processes and enriches data with runner details
   - Updates database (leaderboard + laps)
   - Returns success/error status

---

## Environment Variables Required

### Production (Vercel)

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

```bash
CRON_SECRET=your-random-secret-string-here
BREIZH_CHRONO_URL=https://example.breizhchrono.fr/your-race-url
# OR
RACE_DATA_SOURCE_URL=https://your-timing-provider.com/api
```

### Local Development

Add to `.env.local`:

```bash
CRON_SECRET=local-dev-secret
BREIZH_CHRONO_URL=http://localhost:3000/mock-data  # or actual URL
```

**Note**: Vercel Cron won't run locally. Use the manual trigger script instead (see below).

---

## Verifying Cron Works

### 1. Check Vercel Logs

```bash
# In Vercel Dashboard
Project → Deployments → [Latest Deployment] → Runtime Logs

# Or use Vercel CLI
vercel logs --follow
```

Look for:
- ✅ `Cron job executed successfully`
- ❌ `Unauthorized` - Check CRON_SECRET is set
- ❌ `No active race found` - Check race is active in database
- ❌ `Race not live, skipping fetch` - Check race_state is "live"

### 2. Manual Test (Local or Production)

```bash
# Test the cron endpoint manually
curl -X GET https://your-app.vercel.app/api/cron/fetch-race-data \
  -H "Authorization: Bearer your-cron-secret"

# Should return:
{
  "success": true,
  "runnersUpdated": 150,
  "lapsInserted": 12,
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### 3. Check Database Updates

```sql
-- In Supabase SQL Editor
SELECT
  COUNT(*) as runner_count,
  MAX(timestamp) as last_update
FROM race_leaderboard
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);
```

The `last_update` should be within the last 1 minute when race is live.

### 4. Monitor Cron Execution

Vercel Dashboard → Project → Cron → View Logs

---

## Scraping Frequency & Limits

### Vercel Cron Limits

| Plan | Monthly Executions | Notes |
|------|-------------------|-------|
| Hobby | Limited (check Vercel docs) | Fine for testing |
| Pro | Generous limits | Recommended for production |

**Minimum interval**: 1 minute (can't go faster with cron)

### Current Polling Intervals

| Component | Interval | Location | Purpose |
|-----------|---------|----------|---------|
| **Cron Job** | 60s | `vercel.json` | Fetch from external source → DB |
| **Map Positions** | 2s | `RaceMap.tsx:80` | Real-time runner positions |
| **Countdown** | 5s | `countdown/page.tsx:161,603` | Next lap predictions |
| **Leaderboard** | 10s | `map/page.tsx:160` | Rankings for map filters |
| **Weather** | 30min | `WeatherForecast.tsx:74` | Forecast updates |
| **Config** | 10s | Various pages | Simulation mode check |

### Recommended Settings

#### For Different Data Types

1. **Live Positions (Map)**: **2-5 seconds**
   - Updates runner markers in real-time
   - Critical for crew support use case
   - Current: 2 seconds ✅

2. **Countdown Predictions**: **5-10 seconds**
   - Predictions for next timing mat crossing
   - Balance between accuracy and load
   - Current: 5 seconds ✅

3. **Leaderboard Rankings**: **30-60 seconds**
   - Rankings change slowly in ultra races
   - Can be slower than positions
   - Current: 10 seconds (can increase to 30-60s)

4. **Weather Forecast**: **30-60 minutes**
   - Changes very slowly
   - API has rate limits
   - Current: 30 minutes ✅

#### Rate Limit Considerations

**External Timing System (Breizh Chrono)**:
- Unknown exact limits - **test gradually**
- Start with 1 minute (current)
- Monitor for 429 errors or blocks
- Can increase to 30 seconds if needed
- **Recommended**: Stay at 1 minute unless provider confirms higher rate is OK

**OpenWeatherMap**:
- Free tier: 60 calls/minute, 1,000,000 calls/month
- Current 30min interval = ~1,440 calls/month ✅

**Vercel Edge Functions**:
- No strict limits on reads
- Database connections are the bottleneck

**Supabase Free Tier**:
- 500MB database
- 2GB bandwidth/month
- 50,000 monthly active users
- Current polling is within limits ✅

---

## How to Adjust Intervals

### Cron Job (1 minute → X minutes)

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-race-data",
      "schedule": "*/2 * * * *"  // Every 2 minutes
    }
  ]
}
```

Cron syntax:
- `* * * * *` - Every minute
- `*/2 * * * *` - Every 2 minutes
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

### Client Polling

#### Map Positions

Edit `RaceMap.tsx`:

```typescript
export function RaceMap({
  bibFilter,
  refreshInterval = 5000,  // Change from 2000 to 5000 (5 seconds)
  isTop6Mode = false
}: RaceMapProps) {
```

#### Countdown

Edit `app/live/countdown/page.tsx`:

```typescript
// Line 161 and 603
const interval = setInterval(() => {
  fetchCountdownData();
}, 10000);  // Change from 5000 to 10000 (10 seconds)
```

#### Leaderboard (in Map Page)

Edit `app/live/map/page.tsx`:

```typescript
// Line 160
const leaderboardInterval = setInterval(fetchLeaderboardData, 30000);
// Change from 10000 to 30000 (30 seconds)
```

---

## Testing the Cron Locally

Since Vercel Cron doesn't run in local development, use this helper script:

### Create Test Script

`scripts/test-cron.sh`:

```bash
#!/bin/bash

# Load environment variables
source .env.local

# Call the cron endpoint
curl -X GET http://localhost:3000/api/cron/fetch-race-data \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

Make it executable:

```bash
chmod +x scripts/test-cron.sh
```

Run it:

```bash
# Start dev server first
npm run dev

# In another terminal
./scripts/test-cron.sh
```

### Or use npm script

Add to `package.json`:

```json
{
  "scripts": {
    "test-cron": "node scripts/test-cron.js"
  }
}
```

Create `scripts/test-cron.js`:

```javascript
const CRON_SECRET = process.env.CRON_SECRET || 'local-dev-secret';

async function testCron() {
  const response = await fetch('http://localhost:3000/api/cron/fetch-race-data', {
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`
    }
  });

  const data = await response.json();
  console.log('Cron response:', data);
}

testCron();
```

---

## Performance Optimization Tips

### 1. Use Conditional Fetching

Only fetch when race is active:

```typescript
// The cron already does this
if (config?.race_state !== "live") {
  return NextResponse.json({
    message: "Race not live, skipping fetch",
    raceState: config?.race_state,
  });
}
```

### 2. Client-Side: Pause Polling When Tab Inactive

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Clear interval when tab is hidden
      clearInterval(intervalRef.current);
    } else {
      // Resume polling when tab is visible
      fetchData();
      intervalRef.current = setInterval(fetchData, 5000);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### 3. Use Database Timestamps

Check if data is fresh before re-fetching:

```typescript
// In API route
const { data: config } = await supabase
  .from("race_config")
  .select("last_data_fetch")
  .eq("race_id", activeRace.id)
  .single();

const lastFetch = new Date(config.last_data_fetch);
const now = new Date();
const secondsSinceLastFetch = (now - lastFetch) / 1000;

if (secondsSinceLastFetch < 30) {
  // Data is fresh, return cached
  return getCachedData();
}
```

---

## Troubleshooting

### Cron Not Running

**Check**:
1. ✅ `CRON_SECRET` is set in Vercel environment variables
2. ✅ Race state is "live" in database
3. ✅ Active race exists in database
4. ✅ Deployment is successful (check Vercel dashboard)

**Fix**:
```sql
-- Set race to live
UPDATE race_config
SET race_state = 'live'
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);
```

### "Unauthorized" Error

**Cause**: `CRON_SECRET` mismatch or not set

**Fix**:
1. Check Vercel environment variables
2. Redeploy after adding/changing secret
3. For local testing, ensure `.env.local` has the secret

### No Data Being Fetched

**Check**:
1. ✅ `BREIZH_CHRONO_URL` or `RACE_DATA_SOURCE_URL` is set
2. ✅ URL is accessible (test manually: `curl $BREIZH_CHRONO_URL`)
3. ✅ External timing system has data available

**Debug**:
```bash
# Check cron logs in Vercel
vercel logs --follow

# Look for:
# - "No data source configured"
# - "Failed to fetch race data"
# - "Lap data not available" (OK - will calculate from leaderboard)
```

### Too Many Database Connections

**Cause**: Too frequent polling + many concurrent users

**Fix**:
1. Increase polling intervals (map: 2s → 5s, countdown: 5s → 10s)
2. Use Supabase connection pooling (already enabled with `createClient`)
3. Implement request debouncing on client

### High Bandwidth Usage

**Check**: Supabase dashboard → Project → Settings → Usage

**Fix**:
1. Reduce polling frequency
2. Add `revalidate` cache headers to API routes
3. Use selective field queries (`select("id,bib,name")` instead of `select("*")`)

---

## Summary

### Current Setup (Production-Ready)

✅ Cron: 1 minute interval
✅ Map positions: 2 seconds
✅ Countdown: 5 seconds
✅ Leaderboard (map filters): 10 seconds
✅ Weather: 30 minutes
✅ Authorized with `CRON_SECRET`
✅ Only runs when race is "live"

### Recommended for IAU 24H Championships

- **Keep cron at 1 minute** - Breizh Chrono rate limits unknown
- **Map positions: 2-5 seconds** - Critical for crew support
- **Countdown: 5-10 seconds** - Good balance
- **Leaderboard: 30-60 seconds** - Can be slower (increase from current 10s)
- **Test the external timing URL before race day** - Ensure no rate limiting

### Before Race Day

1. ✅ Verify `CRON_SECRET` is set in Vercel
2. ✅ Verify `BREIZH_CHRONO_URL` is correct
3. ✅ Test cron endpoint manually
4. ✅ Check Vercel cron logs are showing successful executions
5. ✅ Confirm race state is "live"
6. ✅ Monitor database for updates
7. ✅ Test client polling on all pages (map, countdown, leaderboard)

---

## Questions?

- Vercel Cron Docs: https://vercel.com/docs/cron-jobs
- Supabase Limits: https://supabase.com/docs/guides/platform/limits
- OpenWeatherMap API: https://openweathermap.org/price

For issues, check:
1. Vercel deployment logs
2. Supabase database logs
3. Browser console (F12) for client errors

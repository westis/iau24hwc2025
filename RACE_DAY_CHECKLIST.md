# RACE DAY CHECKLIST

## 🚨 CRITICAL: Understanding the Scraping System

### Two-Tier Architecture = Fast Real-Time Updates!

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: External Source → Database (Vercel Cron)                │
│ Breizh Chrono → [60s Vercel Cron] → Supabase Database          │
│ └─ Limited to 60 seconds minimum (Vercel platform limitation)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: Database → UI (Client Polling)                          │
│ Your Database → API Routes → UI Components                      │
│ └─ Can be 2s, 5s, 10s, or whatever you want! No limits!         │
└─────────────────────────────────────────────────────────────────┘
```

**RESULT**: Users see updates every 2-5 seconds, even though you only scrape the external source every 60 seconds!

---

## Pre-Race Day Setup (Do This NOW)

### 1. Set CRON_SECRET Environment Variable

**Generate a secure random secret** (one has been generated for you):

```bash
534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba
```

**Set in Vercel Dashboard:**

1. Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables
2. Click "Add New"
3. Name: `CRON_SECRET`
4. Value: `534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba`
5. Environment: `Production` (and optionally Preview/Development)
6. Click "Save"
7. **IMPORTANT**: Redeploy your application after adding the secret

**For local testing**, add to `.env.local`:
```bash
CRON_SECRET=534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba
```

### 2. Set Breizh Chrono URL

**In Vercel Dashboard:**

1. Go to Environment Variables (same place as above)
2. Add: `BREIZH_CHRONO_URL`
3. Value: The official timing URL (get this from Breizh Chrono)
4. Save and redeploy

**Example formats:**
```bash
# Breizh Chrono format
BREIZH_CHRONO_URL=https://breizhchrono.fr/iau24hwc2025/live

# Other timing system
RACE_DATA_SOURCE_URL=https://your-timing-system.com/api/live
```

### 3. Verify Database is Ready

**Check Supabase:**

1. Go to: https://supabase.com/dashboard/project/[your-project]/editor
2. Verify these tables exist:
   - `race_info` (with active race)
   - `race_config` (with race_id matching active race)
   - `race_leaderboard` (empty or with simulation data)
   - `race_laps` (empty or with simulation data)
   - `runners` (with all registered runners)

**Run this SQL to verify:**
```sql
-- Check active race exists
SELECT id, race_name_en, start_date, end_date, is_active
FROM race_info
WHERE is_active = true;

-- Check race config exists
SELECT race_id, race_state, timing_mat_lat, timing_mat_lon
FROM race_config;

-- Check runners are loaded
SELECT COUNT(*) as runner_count
FROM runners
WHERE bib IS NOT NULL;
```

### 4. Test Cron Endpoint Manually

**Before race day**, verify the cron works:

```bash
# Replace with your actual values
curl -X GET https://your-app.vercel.app/api/cron/fetch-race-data \
  -H "Authorization: Bearer 534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba"
```

**Expected responses:**

✅ **Success (when race is live)**:
```json
{
  "success": true,
  "runnersUpdated": 150,
  "lapsInserted": 12,
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

ℹ️ **Not live yet**:
```json
{
  "message": "Race not live, skipping fetch",
  "raceState": "pre-race"
}
```

❌ **Error - Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```
→ Fix: Check `CRON_SECRET` is set correctly in Vercel

❌ **Error - No data source**:
```json
{
  "error": "No data source configured"
}
```
→ Fix: Set `BREIZH_CHRONO_URL` in Vercel environment variables

---

## Option: Run Custom Scraper from Your Laptop (Alternative to External Cron)

If you want faster scraping (10-30 seconds) or don't want to rely on external services, you can run a custom script directly from your Windows 11 laptop.

### Windows 11 Setup

**1. Open PowerShell or Command Prompt** (in the project directory):

```bash
cd iau24hwc-app
```

**2. Set environment variables and run**:

```bash
# For 10-second scraping (fast updates)
set VERCEL_URL=https://your-app.vercel.app
set CRON_SECRET=534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba
set SCRAPE_INTERVAL=10
npm run scrape
```

```bash
# For 30-second scraping (balanced)
set VERCEL_URL=https://your-app.vercel.app
set CRON_SECRET=534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba
set SCRAPE_INTERVAL=30
npm run scrape
```

```bash
# For 60-second scraping (conservative)
set VERCEL_URL=https://your-app.vercel.app
set CRON_SECRET=534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba
set SCRAPE_INTERVAL=60
npm run scrape
```

**3. What you'll see**:

```
================================================================================
🏃 Race Data Scraper Started
================================================================================
Endpoint: https://your-app.vercel.app/api/cron/fetch-race-data
Interval: 10 seconds
Started: 2025-01-15T10:00:00.000Z
================================================================================

[2025-01-15T10:00:00.000Z] Fetching race data...
✅ SUCCESS (234ms): {
  "success": true,
  "runnersUpdated": 150,
  "lapsInserted": 12
}
   Stats: 1 successes, 0 errors
```

**4. Keep the window open** during the race - it will run continuously.

**5. To stop**: Press `CTRL + C`

### Choosing the Right Interval

| Interval | Updates/min | Updates/hour | Recommended For |
|----------|-------------|--------------|-----------------|
| **10s** | 6 | 360 | Maximum responsiveness, crew notifications |
| **20s** | 3 | 180 | Balanced speed and server load |
| **30s** | 2 | 120 | Good balance, less aggressive |
| **60s** | 1 | 60 | Conservative, minimal server load |

**Recommendation**: Start with **10 seconds** for race day. If you notice issues (rate limiting, errors), increase to 20-30 seconds.

**Note**: 10 seconds means runners passing timing mat will be confirmed within 10 seconds max (plus request time). This gives crews immediate notifications.

**Smart Sequential Strategy**: The script waits for each request to complete before starting the delay timer. This prevents request stacking if Breizh Chrono's server becomes slow, providing automatic backoff protection.

---

## Race Day Morning (Before Race Start)

### 1. Set Race State to "live"

**IMPORTANT**: Race state is **MANUAL**, not automatic! You must set it to "live" when you're ready to start scraping.

**Option A: Via Admin Chat (Easiest)**

1. Go to: https://your-app.vercel.app/admin/chat
2. Send command: `/set-race-state live`
3. Verify response shows: `race_state: "live"`

**Option B: Via API (using curl)**

```bash
curl -X PATCH https://your-app.vercel.app/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"raceState": "live"}'
```

**Option C: Via Supabase Dashboard (last resort)**

```sql
UPDATE race_config
SET race_state = 'live'
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);
```

### 2. Verify Cron is Running

**Check Vercel Logs** (Dashboard → Deployments → [Latest] → Runtime Logs):

Look for entries every minute showing:
```
Cron job executed successfully: /api/cron/fetch-race-data
```

**Or use the Admin Monitoring Page**:
1. Go to: https://your-app.vercel.app/admin/monitoring (we'll create this)
2. Check "Last Data Fetch" timestamp
3. Should update every 60 seconds

### 3. Monitor Data Flow

**Check data is flowing** (use Admin Monitoring page or SQL):

```sql
-- Should show timestamp within last 60 seconds
SELECT
  last_data_fetch,
  race_state,
  simulation_mode
FROM race_config
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);

-- Should show runners with recent timestamps
SELECT
  COUNT(*) as runner_count,
  MAX(timestamp) as most_recent_update
FROM race_leaderboard;
```

---

## During the Race

### Monitor Scraping Health

**Use Admin Monitoring Page** (we'll create):
- Real-time cron status
- Last successful fetch time
- Data freshness indicator
- Runner count on track vs break
- Quick toggle to adjust polling frequency

**What to Watch**:

✅ **Healthy**:
- Last fetch: < 60 seconds ago
- Runner count: Matches expected active runners
- No error messages in logs

⚠️ **Warning**:
- Last fetch: 60-180 seconds ago (1-3 minutes)
- Action: Check Vercel logs, refresh page, wait 2 minutes

🚨 **Critical**:
- Last fetch: > 300 seconds ago (5+ minutes)
- Action: Check external timing system, verify CRON_SECRET, check Vercel function logs

### Adjusting Polling Frequency (if needed)

**If you notice performance issues or rate limiting:**

1. Go to Admin Monitoring page
2. See current intervals:
   - Cron: 60s (CANNOT change without redeploying)
   - Map: 2s (can slow to 5s)
   - Countdown: 5s (can slow to 10s)
   - Leaderboard: 10s (can slow to 60s)

3. Refresh intervals update dynamically

**Note**: You CANNOT change cron frequency during the race (requires code deployment). But you CAN adjust client polling via monitoring page.

### Handling Issues

**Problem: No data updating**

1. Check race_state is "live": `/api/race/config`
2. Check last_data_fetch timestamp
3. Test cron manually (see command above)
4. Check Vercel function logs for errors
5. Verify external timing URL is accessible

**Problem: Data updating but slow**

- This is expected! Cron runs every 60s
- Clients see updates every 2-5s (they're reading cached DB data)
- If truly slow, check database query performance

**Problem: External timing system down**

- Cron will fail but won't crash
- Previous data remains visible to users
- Manual fallback: Use simulation mode temporarily
- Set race_state to "paused" to stop cron attempts

---

## Race States Explained

| State | Description | Cron Behavior | UI Behavior |
|-------|-------------|---------------|-------------|
| `pre-race` | Before race starts | ❌ Skips fetch | Shows countdown |
| `live` | Race is happening | ✅ Fetches every 60s | Real-time updates |
| `paused` | Temporary stop | ❌ Skips fetch | Shows last data |
| `finished` | Race ended | ❌ Skips fetch | Shows final results |

**Change state via Admin Chat**: `/set-race-state <state>`

---

## Scraping Frequency Reference

### Current Settings (Optimized)

| Component | Interval | Purpose | Can Change? |
|-----------|---------|---------|-------------|
| **Vercel Cron** | 60s | External → DB | ❌ No (without redeploy) |
| **Map Positions** | 2s | Runner locations | ✅ Yes (via code or monitoring page) |
| **Countdown** | 5s | Next lap predictions | ✅ Yes |
| **Leaderboard** | 10s | Rankings | ✅ Yes |
| **Weather** | 30min | Forecast | ✅ Yes (already optimal) |

### How to Change Cron Frequency (Requires Redeploy)

**Edit `vercel.json`:**

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

**Cron syntax:**
- `* * * * *` = Every minute (current)
- `*/2 * * * *` = Every 2 minutes
- `*/5 * * * *` = Every 5 minutes

**Then:**
1. Commit changes
2. Push to git
3. Wait for Vercel to auto-deploy
4. Verify in Vercel Cron logs

**Recommended**: Keep at 1 minute unless Breizh Chrono confirms slower is needed

---

## Testing the Complete Flow

**1 Week Before Race:**

1. ✅ Set CRON_SECRET in Vercel
2. ✅ Set BREIZH_CHRONO_URL (if available)
3. ✅ Test cron endpoint manually
4. ✅ Verify returns "Race not live, skipping fetch"

**1 Day Before Race:**

1. ✅ Run simulation mode to test UI
2. ✅ Verify map, countdown, leaderboard all update correctly
3. ✅ Check admin monitoring page works
4. ✅ Test setting race state to "live" and back to "pre-race"

**Race Morning (2-3 hours before start):**

1. ✅ Confirm Breizh Chrono URL is accessible
2. ✅ Set race_state to "live"
3. ✅ Verify cron starts fetching (check logs)
4. ✅ Wait 2 minutes and check database has data
5. ✅ Open live map and verify runners appear
6. ✅ Open countdown page and verify predictions work

**If anything fails:**
- Set race_state back to "pre-race"
- Fix the issue
- Set to "live" again when ready

---

## Quick Reference Commands

### Set Race State

```bash
# Via API
curl -X PATCH https://your-app.vercel.app/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"raceState": "live"}'

# Via SQL
UPDATE race_config SET race_state = 'live' WHERE race_id = (SELECT id FROM race_info WHERE is_active = true);
```

### Test Cron Manually

```bash
curl -X GET https://your-app.vercel.app/api/cron/fetch-race-data \
  -H "Authorization: Bearer 534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba"
```

### Check Last Data Fetch

```bash
curl https://your-app.vercel.app/api/race/config | jq '.last_data_fetch'
```

### Check Vercel Logs

```bash
vercel logs --follow
```

---

## Emergency Procedures

### Cron Stopped Working

1. Check Vercel function logs
2. Verify CRON_SECRET is set
3. Test manual cron call
4. Check external timing URL
5. If all else fails: Use simulation mode temporarily

### Too Many Database Connections

1. Increase client polling intervals (map: 2s → 5s)
2. Check for infinite loops in client code
3. Monitor Supabase dashboard for connection count

### Rate Limited by Breizh Chrono

1. Increase cron interval to 2-5 minutes
2. Coordinate with timing system provider
3. Redeploy with new schedule

---

## Contact During Race

**Vercel Dashboard**: https://vercel.com/dashboard
**Supabase Dashboard**: https://supabase.com/dashboard
**Admin Monitoring**: https://your-app.vercel.app/admin/monitoring
**Admin Chat**: https://your-app.vercel.app/admin/chat

**Emergency SQL**:
```sql
-- Pause scraping
UPDATE race_config SET race_state = 'paused';

-- Resume scraping
UPDATE race_config SET race_state = 'live';

-- Check cron health
SELECT race_state, last_data_fetch,
       EXTRACT(EPOCH FROM (NOW() - last_data_fetch)) as seconds_since_fetch
FROM race_config;
```

---

## Post-Race

### Set Race State to Finished

```bash
curl -X PATCH https://your-app.vercel.app/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"raceState": "finished"}'
```

This stops the cron from making unnecessary API calls and preserves final results.

---

## Summary

### ✅ Before Race
- Set `CRON_SECRET` in Vercel
- Set `BREIZH_CHRONO_URL` in Vercel
- Test cron manually
- Verify race_config exists

### ✅ Race Morning
- Set `race_state` to `"live"` (MANUAL!)
- Verify cron starts running (check logs)
- Verify data appears in database
- Test map and countdown pages

### ✅ During Race
- Monitor admin dashboard
- Watch for data freshness (< 60s)
- Adjust client polling if needed
- Check Vercel logs for errors

### ✅ After Race
- Set `race_state` to `"finished"`
- Verify final results are saved
- Download/backup data if needed

**Remember**: Cron is 60s (external → DB), but clients can poll every 2s (DB → UI) for real-time feel!

# BreizhChrono Live Timing Setup Guide

This guide covers setting up the BreizhChrono live timing integration for the IAU 24H World Championship.

## Prerequisites

- Database migrations 030 and 031 applied
- Active race configuration in database
- Runner bib numbers assigned via admin panel

## Environment Variables

Add these to your `.env.local` (development) and Vercel environment variables (production):

```env
# BreizhChrono Live Timing
BREIZH_CHRONO_URL=https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14
FIRST_LAP_DISTANCE=0.1
LAP_DISTANCE=1.5
STALE_DATA_THRESHOLD_MINUTES=5

# Cron Security (generate a random string)
CRON_SECRET=your_random_secret_here
```

## Setup Steps

### 1. Run Database Migrations

In Supabase SQL Editor, run these migrations:

```bash
# In your Supabase dashboard:
1. Go to SQL Editor
2. Run migration 030_add_bib_number.sql
3. Run migration 031_add_lap_tracking.sql
```

### 2. Assign Bib Numbers

1. Go to `/admin/bib-numbers`
2. Enter bib numbers for each runner
3. Ensure no duplicates (the UI will warn you)
4. Click "Save All"

### 3. Test the Scraper (Before Race Day)

```bash
npm run test-scraper
```

This will:

- Check robots.txt compliance
- Test CORS headers
- Attempt to fetch data
- Parse the response

**Note:** The test will likely fail before race day since live data isn't available yet. Run it again closer to race time.

### 4. Configure Race State

1. Go to `/admin/race-live`
2. Set race state to "Live" when race starts
3. Data fetching will begin automatically

## How It Works

### Data Flow

1. **Cron Job** runs every minute (Vercel limitation)

   - Fetches HTML from BreizhChrono URL
   - Parses leaderboard data
   - Matches runners by bib number

2. **Lap Calculation**

   - If lap data isn't provided, calculates laps from distance increases
   - First lap: 100m (start offset)
   - Subsequent laps: 1.5km each

3. **Database Update**

   - Upserts leaderboard data
   - Inserts new lap records
   - Updates `last_data_fetch` timestamp

4. **Frontend Display**
   - Leaderboard refreshes every 60 seconds
   - Shows stale data warning if no update in 5+ minutes
   - Map continues predicting positions between updates

### Lap Calculation Logic

The system detects new laps based on distance increases:

- **First lap:** When distance >= 0.09km (90m with 10% tolerance)
  - Distance calculation: 0.1km
- **Subsequent laps:** When distance increases by ~1.5km
  - Distance calculation: previous + 1.5km
- **Multiple laps:** If runner completes 2+ laps between updates, distributes time equally

Example:

```
Update 1: Distance = 0 km
Update 2: Distance = 0.12 km → First lap detected (0.1 km)
Update 3: Distance = 1.7 km → Second lap detected (1.5 km)
Update 4: Distance = 4.8 km → Laps 3 and 4 detected (2 × 1.5 km)
```

## Troubleshooting

### No Data Fetched

1. Check race state is "Live"
2. Verify `BREIZH_CHRONO_URL` is correct
3. Check Vercel cron logs
4. Test with `npm run test-scraper`

### Data Is Stale

1. Check Vercel cron is running (Dashboard → Cron Jobs)
2. Verify `CRON_SECRET` matches in both places
3. Check `/api/cron/fetch-race-data` logs

### Wrong Lap Calculations

1. Verify `FIRST_LAP_DISTANCE` and `LAP_DISTANCE` settings
2. Check if timing system provides actual lap data
3. Review lap calculation logic in console logs

### Duplicate Bib Numbers

1. Go to `/admin/bib-numbers`
2. UI will highlight duplicates in red
3. Fix duplicates and save

## Monitoring During Race

### Admin Dashboard (`/admin/race-live`)

- **Mock Data Tab:** Generate test data
- **JSON Upload Tab:** Manual data upload
- **Race Control Tab:** Change race state
- **Data Fetcher Tab:** Manual trigger, view logs

### Check Data Freshness

```
GET /api/race/staleness
```

Returns:

```json
{
  "isStale": false,
  "lastFetch": "2025-10-16T10:30:00Z",
  "minutesSinceLastFetch": 0.5,
  "message": "Data is fresh"
}
```

### Manual Data Fetch

If cron fails, you can manually trigger:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/fetch-race-data
```

## Performance Considerations

### Vercel Limits

- **Hobby Plan:** 1-minute cron minimum
- **Pro Plan:** 30-second crons available
- **Enterprise:** Sub-minute crons available

### For 30-Second Updates on Hobby Plan

Use client-side polling instead of cron:

1. Frontend calls `/api/race/refresh` every 30s
2. API endpoint triggers data fetch
3. Returns fresh data to client

### Database Load

- Each update: ~80 runners × 2 queries = 160 queries
- With 1-minute intervals: 2,880 queries/day
- Well within Supabase free tier (50,000/day)

## Alternative: Manual Data Entry

If scraping fails, you can manually upload data:

1. Export data from BreizhChrono (if available)
2. Convert to JSON format:

```json
[
  {
    "bib": 101,
    "name": "John Doe",
    "distanceKm": 45.5,
    "raceTimeSec": 21600,
    "lap": 30
  }
]
```

3. Upload via `/admin/race-live` → JSON Upload tab

## Testing Checklist

Before race day:

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Bib numbers assigned to all runners
- [ ] Test scraper runs successfully
- [ ] Cron job configured in Vercel
- [ ] Admin access verified
- [ ] Staleness warning tested
- [ ] Map predictions working

During race:

- [ ] Set race state to "Live"
- [ ] Verify data is updating (check timestamps)
- [ ] Monitor stale data warnings
- [ ] Check lap calculations are accurate
- [ ] Confirm map positions updating

## Support

For issues:

1. Check Vercel logs (Runtime Logs tab)
2. Check Supabase logs (Logs & Analytics)
3. Review browser console for frontend errors
4. Test scraper output: `npm run test-scraper`

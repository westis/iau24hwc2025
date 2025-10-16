# Live Race Tracking - Quick Start Guide

Get your live race tracking system up and running in 5 minutes!

## Step 1: Install Dependencies (1 min)

```bash
cd iau24hwc-app
npm install recharts
```

## Step 2: Run Database Migration (1 min)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/022_create_live_race_tables.sql`
5. Click **Run**

✅ This creates the `race_config`, `race_laps`, `race_leaderboard`, and `race_updates` tables

## Step 3: Generate Test Data (30 seconds)

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/race-live`
3. In the **Mock Data** tab:
   - Enter **12** for elapsed hours
   - Click **Generate & Upload Mock Data**
4. In the **Race Control** tab:
   - Click **Start Race (Live)**

✅ You now have 12 hours of simulated race data!

## Step 4: View Live Leaderboard (10 seconds)

Navigate to: `http://localhost:3000/live`

You should see:

- ✅ Race clock showing elapsed time
- ✅ Weather forecast (24 hours)
- ✅ Leaderboard with 11 runners
- ✅ Filter tabs (Overall/Men/Women/Watchlist)
- ✅ Search bar
- ✅ Click any runner to see lap details
- ✅ Star icon to add to watchlist

## Step 5: Explore Features (1 min)

### Leaderboard (`/live`)

- **Star runners** - Click ⭐ to add to watchlist
- **Search** - Type bib, name, or country
- **Expand rows** - Click runner to see all laps
- **Filter** - Switch between Overall/Men/Women/Watchlist

### Charts (`/live/charts`)

- **Select runners** - Choose Top 6, Watchlist, or Custom
- **Time range** - Toggle 6h / 12h / 24h views
- **View projection** - See projected 24h distance

### Map (`/live/map`)

- Placeholder for virtual map (coming soon)

### Admin (`/admin/race-live`)

- **Mock Data** - Generate more test data
- **JSON Upload** - Upload custom data files
- **Race Control** - Change race state
- **Data Fetcher** - Manual data sync

## Common Tasks

### Add More Mock Data

```
Admin → Mock Data → Change hours → Generate & Upload
```

### Test Different Race States

```
Admin → Race Control → Click state button
```

### Clear Watchlist

```
Open browser DevTools → Console:
localStorage.removeItem('race_watchlist')
```

### View API Response

```bash
# Leaderboard
curl http://localhost:3000/api/race/leaderboard

# Lap details for bib 101
curl http://localhost:3000/api/race/laps/101

# Chart data
curl "http://localhost:3000/api/race/chart-data?bibs=101,102&range=12h"
```

## For Race Day

### Option 1: JSON Data Source

1. Host JSON files with your timing data
2. Set environment variable:
   ```env
   RACE_DATA_SOURCE_URL=https://your-site.com/data
   ```
3. Deploy to Vercel
4. Cron job will fetch every 60s

### Option 2: Custom Adapter

1. Edit `lib/live-race/data-adapter.ts`
2. Implement your timing system's adapter
3. Update `app/api/cron/fetch-race-data/route.ts`
4. Deploy to Vercel

### Option 3: Manual Updates

1. Upload JSON via Admin panel
2. Structure:
   ```json
   {
     "laps": [...],
     "leaderboard": [...]
   }
   ```

## Troubleshooting

### No data showing

- ✅ Check migration ran successfully
- ✅ Upload mock data from admin
- ✅ Set race state to "Live"

### Charts not rendering

- ✅ Install recharts: `npm install recharts`
- ✅ Restart dev server

### Weather shows mock data

- ✅ This is normal without API key
- ✅ Add `OPENWEATHER_API_KEY` to use real weather

### Vercel Cron not working

- ✅ Add `CRON_SECRET` environment variable
- ✅ Ensure `vercel.json` is in project root
- ✅ Deploy to Vercel (cron doesn't work locally)

## Next Steps

1. ✅ Customize runner data (use your actual runners)
2. ✅ Connect to real timing system
3. ✅ Configure weather API (optional)
4. ✅ Add course GPX for virtual map (optional)
5. ✅ Deploy to Vercel

## Support Files

- `LIVE_RACE_SETUP.md` - Detailed setup guide
- `LIVE_RACE_IMPLEMENTATION_SUMMARY.md` - Complete feature list
- `live-race-tracking.plan.md` - Original implementation plan

## Success! 🎉

You now have a fully functional live race tracking system. Test it with mock data, then connect it to your actual timing system for race day.

**Main URLs:**

- Leaderboard: `/live`
- Charts: `/live/charts`
- Map: `/live/map`
- Admin: `/admin/race-live`




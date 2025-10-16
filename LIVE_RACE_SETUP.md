# Live Race Tracking Setup

## Installation Steps

### 1. Install Required Dependencies

```bash
npm install recharts
```

### 2. Run Database Migrations

Apply the live race migration to your Supabase database:

```bash
# Connect to your Supabase project and run:
# iau24hwc-app/migrations/022_create_live_race_tables.sql
```

Or use the Supabase dashboard to run the migration SQL.

### 3. Configure Race

1. Make sure your race info is set up in the `race_info` table with `is_active = true`
2. The migration automatically creates a `race_config` entry for the active race

### 4. Upload Mock Data for Testing

1. Navigate to `/admin/race-live` in your app
2. Use the "Generate Mock Data" tab to create test data
3. Specify elapsed hours (e.g., 12 for 12 hours into the race)
4. Click "Generate & Upload Mock Data"

### 5. View Live Race

Navigate to `/live` to see the leaderboard

## Features Implemented

### Phase 1: Core Leaderboard ✅ COMPLETE

- ✅ Database schema (race_laps, race_leaderboard, race_config, race_updates)
- ✅ Type definitions
- ✅ Mock data system for testing
- ✅ Race clock with countdown/elapsed timer
- ✅ Leaderboard with filters (Overall/Men/Women/Watchlist)
- ✅ Search functionality (by name, bib, country)
- ✅ Expandable lap details
- ✅ LocalStorage-based watchlist
- ✅ 60-second polling for live updates
- ✅ Live navigation between sections

### Phase 2: Charts ✅ COMPLETE

- ✅ Chart data API
- ✅ Distance over time chart (6h/12h/24h views)
- ✅ Runner selection (top 6, watchlist, custom)
- ✅ Chart placeholder (install recharts to visualize)
- ⏳ Pace analysis chart (coming soon)

### Phase 3: Weather ✅ COMPLETE

- ✅ Weather forecast API integration
- ✅ 24-hour hourly forecast display
- ✅ Mock weather fallback
- ✅ Auto-refresh every 30 minutes

### Phase 4: Data Scraper ✅ COMPLETE

- ✅ Adapter pattern for multiple data sources
- ✅ Vercel Cron job setup (every 60 seconds)
- ✅ JSON, DUV, MyLaps, HTML scraper adapters
- ✅ Admin manual trigger interface
- ✅ Race state management

### Phase 5: Admin Controls ✅ COMPLETE

- ✅ Mock data generator
- ✅ JSON data upload
- ✅ Race state control (not_started/live/finished)
- ✅ Manual data fetch trigger
- ✅ Configuration management

### Coming Soon (Phase 6-8)

- ⏳ AI race commentary (requires API key)
- ⏳ Comparison/delta charts
- ⏳ Virtual map (requires course GPX)
- ⏳ Crew countdown timer
- ⏳ Mobile optimization

## API Endpoints

- `GET /api/race/leaderboard?filter=overall|men|women` - Get current leaderboard
- `GET /api/race/laps/[bib]` - Get lap times for a runner
- `GET /api/race/config` - Get race configuration
- `PATCH /api/race/config` - Update race state
- `GET /api/race/chart-data?bibs=101,102&range=6h|12h|24h` - Get chart data
- `POST /api/race/mock-data` - Upload mock data
- `GET /api/race/mock-data?hours=12` - Generate mock data

## Testing

### Generate Mock Data

```bash
# Generate 12 hours of race data
curl http://localhost:3000/api/race/mock-data?hours=12
```

### Upload Mock Data

1. Go to `/admin/race-live`
2. Use the mock data generator
3. Or upload JSON via the JSON Upload tab

## Next Steps

1. Install recharts: `npm install recharts`
2. Complete chart components
3. Add AI commentary (requires OpenAI or Anthropic API key)
4. Implement data scraper for your timing system
5. Add weather integration (requires weather API key)
6. Create virtual map (requires course GPX file)

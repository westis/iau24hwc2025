# Mock Live Race Guide

This guide shows you how to simulate a live race for testing and development.

## Quick Start

### Load Mock Data

Run this command to simulate a live race:

```bash
npm run mock-live 12
```

This will:

1. Generate mock lap data for all registered runners
2. Simulate 12 hours of race progress
3. Load the data into your database
4. Set the race state to "LIVE"

### View the Live Page

Open your browser to:

```
http://localhost:3000/live
```

You'll see:

- ✅ Live leaderboard with all runners
- ✅ Realistic lap times and distances
- ✅ Projected 24h distances
- ✅ Runner trends (up/down/stable)
- ✅ Team standings
- ✅ Distance charts

## Usage

### Simulate Different Race Durations

```bash
npm run mock-live 6    # 6 hours into race
npm run mock-live 12   # 12 hours into race
npm run mock-live 18   # 18 hours into race
npm run mock-live 23   # Almost finished
```

### Clear Mock Data

To clear the mock data and start fresh:

1. Go to admin panel: `/admin/race-config`
2. Set race state back to "not_started"
3. Or run the mock-live command again (it clears old data automatically)

## How It Works

### Data Generation

The system generates realistic mock data by:

1. **Using Real Runners**: Pulls all registered runners from your database
2. **Realistic Speeds**: Assigns base speeds based on gender (9.5-12 km/h for men, 8.5-10.5 km/h for women)
3. **Fatigue Simulation**: Pace slows down over time (up to 30% slower at 24h)
4. **Random Variation**: Each lap has ±10% variation for realism
5. **Course Distance**: Uses your configured course distance (default: 0.821 km)

### What Gets Generated

- **Lap Times**: Complete lap-by-lap data for each runner
- **Leaderboard**: Current standings with projected distances
- **Trends**: Performance indicators (speeding up/slowing down)
- **Timestamps**: Realistic race time progression

## API Endpoints

### Generate Mock Data (without loading)

```bash
curl "http://localhost:3000/api/race/mock-data?hours=12"
```

Returns JSON with mock data (doesn't save to database).

### Load Mock Data

```bash
curl -X POST http://localhost:3000/api/race/mock-data \
  -H "Content-Type: application/json" \
  -d @mock-data.json
```

## Testing Features

With mock data loaded, you can test:

- ✅ **Leaderboard Filters**: Overall, Men, Women, Watchlist
- ✅ **Country Filter**: Filter by nationality
- ✅ **Search**: Search by name, bib, or country
- ✅ **Watchlist**: Add/remove favorites
- ✅ **Live Updates**: Data refreshes every 60 seconds
- ✅ **Team Standings**: Men's and Women's team rankings
- ✅ **Charts**: Distance progression over time
- ✅ **Lap Details**: Expand runner rows to see lap-by-lap data
- ✅ **Mobile View**: Test responsive design

## Production Note

⚠️ **Important**: This mock data feature is for **development and testing only**.

In production:

- Mock data endpoints should be protected or disabled
- Real data will come from your timing system integration
- The race state should be managed through the admin panel

## Troubleshooting

### No Data Showing

1. Check that you have runners in your database
2. Verify the race is set as "active" in race_info table
3. Check browser console for errors
4. Try clearing your browser cache

### Slow Loading

- The script generates data for all runners (up to 80)
- Reduce the hours parameter for faster generation
- Check your database connection

### Wrong Race Time

- Make sure your race start/end dates are configured correctly
- The mock data uses a simulated timeline for testing
- Real race time comes from your race_info table

## Next Steps

After testing with mock data:

1. Clear the mock data
2. Set up your real timing system integration
3. Configure the data adapters in `/lib/live-race/data-adapter.ts`
4. Test with real race data during a test event



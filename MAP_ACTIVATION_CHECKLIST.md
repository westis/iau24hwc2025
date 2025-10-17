# Live Race Map - Activation Checklist

Use this checklist to activate the live race map feature.

## Prerequisites

- [x] All code files have been created
- [x] GPX file is in place at `public/course/albi-24h.gpx`
- [ ] Database migration has been run
- [ ] App has been restarted/rebuilt

## Activation Steps

### 1. Run Database Migration

```bash
# Option A: Using psql
psql -U your_user -d your_database -f migrations/028_add_map_config.sql

# Option B: Using Supabase SQL Editor
# Copy the contents of migrations/028_add_map_config.sql
# Paste and run in Supabase SQL Editor
```

**What this does:**

- Adds 5 new columns to `race_config` table
- Sets default timing mat coordinates (first point of GPX)
- Sets default break detection threshold (2.5x)
- Sets default overdue display duration (180 seconds)
- Sets default GPX file path

### 2. Verify Migration

```sql
-- Check that columns were added
SELECT
  timing_mat_lat,
  timing_mat_lon,
  break_detection_threshold_multiplier,
  overdue_display_seconds,
  course_gpx_url
FROM race_config
WHERE race_id = 1;
```

Expected output:

```
timing_mat_lat: 43.9232716
timing_mat_lon: 2.1670189
break_detection_threshold_multiplier: 2.50
overdue_display_seconds: 180
course_gpx_url: /course/albi-24h.gpx
```

### 3. Restart/Rebuild Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

### 4. Test the Feature

1. Navigate to `/live`
2. Click on the "Map" tab
3. Verify:
   - [ ] Map loads without errors
   - [ ] Course track is visible (blue polyline)
   - [ ] Timing mat marker is at the start (green pin)
   - [ ] If simulation/live data exists, runners appear
   - [ ] Legend shows in top-right
   - [ ] Stats show in bottom-left
   - [ ] Break panel appears below map

### 5. Test with Simulation Data (Optional)

If you want to test with mock data:

```bash
# Generate and upload 12 hours of mock data
npm run simulate-live
```

Then refresh the map page to see runners moving.

## Troubleshooting

### Map doesn't load

- Check browser console for errors
- Verify migration ran successfully
- Check that timing mat coordinates are set

### "Failed to load course GPX data" error

- Verify `public/course/albi-24h.gpx` exists
- Check file permissions
- Try accessing directly: `http://localhost:3000/course/albi-24h.gpx`

### No runners showing

- Verify race is active: `SELECT * FROM race_info WHERE is_active = true`
- Check lap data exists: `SELECT COUNT(*) FROM race_laps`
- Verify leaderboard has data: `SELECT COUNT(*) FROM race_leaderboard`

### Runners in wrong positions

- Check timing mat coordinates are correct
- Compare with actual course start/finish
- Update if needed:

```sql
UPDATE race_config
SET timing_mat_lat = YOUR_LAT, timing_mat_lon = YOUR_LON
WHERE race_id = 1;
```

## Configuration (Optional)

### Adjust Break Detection Sensitivity

If too many/few runners are marked as "on break":

```sql
-- Make LESS sensitive (fewer breaks detected)
UPDATE race_config
SET break_detection_threshold_multiplier = 3.0
WHERE race_id = 1;

-- Make MORE sensitive (more breaks detected)
UPDATE race_config
SET break_detection_threshold_multiplier = 2.0
WHERE race_id = 1;
```

### Adjust Overdue Display Duration

How long to show runners as "overdue" before marking as "on break":

```sql
-- Show overdue for 5 minutes (300 seconds)
UPDATE race_config
SET overdue_display_seconds = 300
WHERE race_id = 1;

-- Show overdue for 2 minutes (120 seconds)
UPDATE race_config
SET overdue_display_seconds = 120
WHERE race_id = 1;
```

### Set Exact Timing Mat Location

If you need to adjust the timing mat location:

1. Open the map
2. Note where timing mat should be
3. Use Google Maps to get exact coordinates
4. Update database:

```sql
UPDATE race_config
SET
  timing_mat_lat = YOUR_LATITUDE,
  timing_mat_lon = YOUR_LONGITUDE
WHERE race_id = 1;
```

## Success Criteria

The map feature is successfully activated when:

- [x] Migration has run without errors
- [ ] Map loads on `/live?view=map`
- [ ] Course track is visible
- [ ] Timing mat marker appears
- [ ] Runners appear (when lap data exists)
- [ ] Clicking runners shows popup
- [ ] Break panel updates
- [ ] Legend is visible
- [ ] No console errors

## Need Help?

See `LIVE_RACE_MAP_GUIDE.md` for detailed documentation.

## Quick Links

- Setup Guide: `LIVE_RACE_MAP_GUIDE.md`
- Implementation Summary: `LIVE_MAP_IMPLEMENTATION_SUMMARY.md`
- Migration File: `migrations/028_add_map_config.sql`
- API Endpoint: `/api/race/positions`

---

**Note:** The map will only show runners when:

1. Race is active
2. Runners have lap data
3. Leaderboard entries exist with `last_passing` timestamps

During testing, use simulation mode or mock data to populate these.



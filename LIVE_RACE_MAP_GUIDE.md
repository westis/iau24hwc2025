# Live Race Map Feature Guide

## Overview

The live race map feature displays runner positions on an interactive OpenStreetMap, showing where each runner is estimated to be on the course based on their last timing mat passing and predicted pace.

## Features

- **Real-time position estimation**: Runners are positioned along the GPX course track based on their progress
- **Smart break detection**: Automatically detects when runners are on break using configurable thresholds
- **Status indicators**:
  - Gold marker (1st place)
  - Silver marker (2-3rd place)
  - Bronze marker (4-10th place)
  - Blue marker (others)
  - Orange marker (overdue/late)
- **Break panel**: Separate panel showing runners currently on break
- **Interactive popups**: Click any runner marker to see detailed information

## Setup

### 1. Run the Database Migration

```bash
# Apply the migration to add map config fields
psql -U your_user -d your_database -f migrations/028_add_map_config.sql
```

Or if using Supabase, run the migration in the SQL editor.

### 2. Configure Timing Mat Coordinates (Optional)

The default coordinates are set to the first point of the Albi GPX track (43.9232716, 2.1670189). If you need to adjust these:

```sql
UPDATE race_config
SET timing_mat_lat = YOUR_LATITUDE,
    timing_mat_lon = YOUR_LONGITUDE
WHERE race_id = 1;
```

To find the correct coordinates:

1. Open the live map page
2. Identify where the timing mat actually is on the course
3. Use a tool like Google Maps to get the exact coordinates
4. Update the database

### 3. Adjust Break Detection Settings (Optional)

```sql
-- Change break detection threshold (default: 2.5x predicted lap time)
UPDATE race_config
SET break_detection_threshold_multiplier = 2.0
WHERE race_id = 1;

-- Change overdue display duration (default: 180 seconds)
UPDATE race_config
SET overdue_display_seconds = 300
WHERE race_id = 1;
```

### 4. GPX File Configuration

The GPX file is located at `/public/course/albi-24h.gpx`. To use a different course:

1. Place your GPX file in `/public/course/`
2. Update the database:

```sql
UPDATE race_config
SET course_gpx_url = '/course/your-course.gpx'
WHERE race_id = 1;
```

## How It Works

### Position Calculation

1. **Get last passing time**: When runner last crossed the timing mat
2. **Predict lap time**: Use recent lap times to estimate current lap time
3. **Calculate progress**: `(time_since_passing / predicted_lap_time) * 100`
4. **Map to coordinates**: Find position along GPX track based on progress percentage

### Break Detection Algorithm

Runners are marked as "on break" when:

- Time since last passing > (predicted lap time × threshold multiplier)
- Default threshold: 2.5x predicted lap time
- Threshold adapts to each runner's pace

### Overdue Status

When a runner is late but not yet on break:

- Show for configurable duration (default: 180 seconds)
- Display orange marker with warning indicator
- Keep estimating position along track

## Usage

### Accessing the Map

1. Navigate to the Live page
2. Click the "Map" tab
3. The map will load showing all active runners

### Understanding the Display

**Runner Markers:**

- Number inside = Bib number
- Color = Position (gold/silver/bronze/blue) or status (orange = overdue)
- Click marker for detailed runner info

**Break Panel:**

- Shows runners currently on break
- Sorted by time overdue (longest first)
- Updates automatically

**Legend:**

- Located in top-right corner
- Explains marker colors

**Stats:**

- Located in bottom-left corner
- Shows count of runners on course vs. on break

## Troubleshooting

### Map Not Loading

1. Check that migration has been run
2. Verify GPX file exists at `/public/course/albi-24h.gpx`
3. Check browser console for errors
4. Ensure timing mat coordinates are set in database

### Runners Not Showing

1. Verify runners have lap data in `race_laps` table
2. Check that runners have `last_passing` timestamp
3. Ensure race is marked as active

### Positions Look Wrong

1. Verify timing mat coordinates are correct
2. Check GPX file matches actual course
3. Adjust break detection threshold if needed

### Break Detection Too Sensitive/Not Sensitive

Adjust the threshold multiplier:

- **Too sensitive** (too many on break): Increase multiplier (e.g., 3.0)
- **Not sensitive** (too few on break): Decrease multiplier (e.g., 2.0)

## Configuration Reference

| Setting                                | Default                | Description                           |
| -------------------------------------- | ---------------------- | ------------------------------------- |
| `timing_mat_lat`                       | 43.9232716             | Latitude of timing mat                |
| `timing_mat_lon`                       | 2.1670189              | Longitude of timing mat               |
| `break_detection_threshold_multiplier` | 2.5                    | Break threshold multiplier            |
| `overdue_display_seconds`              | 180                    | How long to show overdue before break |
| `course_gpx_url`                       | `/course/albi-24h.gpx` | Path to GPX file                      |

## API Endpoint

The map uses the `/api/race/positions` endpoint:

```
GET /api/race/positions?bibs=1,2,3
```

Parameters:

- `bibs` (optional): Comma-separated list of bib numbers to filter

Response:

```json
{
  "positions": [...],
  "onBreak": [...],
  "timingMatPosition": { "lat": 43.92, "lon": 2.16 },
  "courseTrack": [...],
  "lastUpdate": "2025-10-18T12:00:00Z"
}
```

## Performance Notes

- GPX data is cached for 1 minute
- Position updates every 5 seconds by default
- Only active runners are rendered
- Map bounds automatically fit course + runners

## Future Enhancements

Potential improvements:

- Admin UI for setting timing mat coordinates (drag-and-drop pin)
- Multiple timing points along the course
- Heatmap showing runner density
- Replay mode to visualize race history
- Export runner tracks as GPX

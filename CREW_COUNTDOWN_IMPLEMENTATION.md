# Crew Countdown Feature - Implementation Summary

## Overview

A new crew countdown feature has been implemented in the live section that predicts when runners will next pass the timing mat and adjustable crew spots using intelligent lap time estimation based on recent performance trends.

## What Was Implemented

### 1. Database Migration ✓

- **File**: `migrations/026_add_crew_spot_offset.sql`
- Added `crew_spot_offset_meters` column to `race_config` table
- Allows positive (after timing mat) or negative (before timing mat) values

### 2. Type Definitions ✓

- **File**: `types/live-race.ts`
- Added `crewSpotOffsetMeters` to `RaceConfig` interface
- Created `NextLapPrediction` interface for countdown data
- Created `CountdownResponse` interface for API responses

### 3. Lap Prediction Algorithm ✓

- **File**: `lib/live-race/lap-predictor.ts`
- Smart statistical algorithm with:
  - **Break lap detection**: Identifies and excludes laps >175% of median
  - **Weighted moving average**: Recent laps weighted more heavily (weights: 1,2,3,4,5)
  - **Trend adjustment**: Accounts for runner slowing down (10% of slope)
  - **Confidence scoring**: Based on coefficient of variation (CV)
    - High (>0.8): CV < 0.15
    - Medium (0.5-0.8): CV 0.15-0.25
    - Low (<0.5): CV > 0.25
  - Uses last 5 valid laps from most recent 10 laps

### 4. API Endpoints ✓

#### Countdown API

- **File**: `app/api/race/countdown/route.ts`
- **Endpoint**: `GET /api/race/countdown`
- **Parameters**:
  - `bibs=1,2,3` - Get countdown for specific runners
  - `country=SWE&gender=m` - Get countdown for team
- **Returns**: Array of predictions with timing mat and crew spot countdowns
- **Caching**: 5 seconds (for real-time updates)

#### Race Config API (Updated)

- **File**: `app/api/race/config/route.ts`
- Added `crewSpotOffsetMeters` handling in PATCH endpoint
- Returns crew spot offset in GET response

### 5. Countdown Page ✓

- **File**: `app/live/countdown/page.tsx`
- **Route**: `/live/countdown`
- **Features**:
  - Two tabs: Team and Watchlist
  - Country and gender selector for teams
  - Crew spot offset adjuster (±10m buttons or manual input)
  - Auto-refresh every 5 seconds
  - Real-time client-side countdown between fetches

### 6. Countdown Card Component ✓

- **File**: `components/live/CountdownCard.tsx`
- Displays for each runner:
  - Runner info (bib, name, country flag)
  - Progress bar showing lap completion
  - **Timing Mat countdown** (large, prominent)
  - **Crew Spot countdown** (secondary, shows offset)
  - Last passing time (relative, e.g., "3 min ago")
  - Estimated lap time
  - Confidence indicator with tooltip
  - Visual states:
    - Counting down: Normal colors
    - Overdue: Red with "+" prefix
    - Low confidence: Warning icon

### 7. Admin UI Updates ✓

- **File**: `app/admin/race-live/page.tsx`
- Added crew spot offset control in Course Settings section
- Input field with Update button
- Helper text explaining positive/negative values

### 8. Navigation Update ✓

- **File**: `components/live/LiveNavigation.tsx`
- Added "Countdown" tab with Timer icon
- Appears alongside Leaderboard, Charts, and Map

### 9. Translations ✓

- **Files**: `lib/i18n/types.ts`, `lib/i18n/translations/en.ts`, `lib/i18n/translations/sv.ts`
- Added translation keys:
  - `countdown` - "Countdown" / "Nedräkning"
  - `timingMat` - "Timing Mat" / "Tidtagningsmatta"
  - `crewSpot` - "Crew Spot" / "Depåplats"
  - `estimatedLapTime` - "Est. Lap Time" / "Beräknad varvtid"
  - `confidence` - "Confidence" / "Tillförlitlighet"
  - `overdue` - "Overdue" / "Försenad"
  - `crewSpotOffset` - "Crew Spot Offset" / "Depåplatsavstånd"
  - `selectTeam` - "Select Team" / "Välj lag"
  - `noTeamSelected` - "No Team Selected" / "Inget lag valt"
  - `selectTeamToView` - "Select a country..." / "Välj land..."
  - `team` - "Team" / "Lag"

## How to Use

### For Race Admins

1. **Set Crew Spot Offset**:

   - Go to `/admin/race-live`
   - In "Course Settings" section, find "Crew Spot Offset (meters)"
   - Enter offset value:
     - **Positive number** (e.g., +200): Crew spot is 200m AFTER timing mat
     - **Negative number** (e.g., -150): Crew spot is 150m BEFORE timing mat
   - Click "Update" button

2. **Run Database Migration**:
   ```bash
   # The migration needs to be applied to add the new column
   # Connect to your Supabase instance and run:
   # migrations/026_add_crew_spot_offset.sql
   ```

### For Crew Members

1. **Access Countdown Page**:

   - Navigate to the Live section
   - Click on the "Countdown" tab

2. **View Team Countdown**:

   - Select your country from the dropdown
   - Select gender (Men/Women)
   - View all team members with countdowns

3. **View Watchlist Countdown**:

   - First, add runners to your watchlist from the Leaderboard tab
   - Then, switch to the "Watchlist" tab in Countdown
   - View your selected runners

4. **Adjust Crew Spot Offset (Local)**:
   - Use the +/- buttons to adjust in 10m increments
   - Or manually enter a value and press Enter
   - This only affects your local view

### Understanding the Countdown

- **Timing Mat**: Time until runner passes the official timing mat
- **Crew Spot**: Time until runner passes your crew location
- **Green/Normal**: Countdown in progress
- **Red with "+"**: Runner is overdue (may be on break)
- **Progress Bar**: Shows how far through the current lap
- **Confidence Icon**: Shows prediction reliability
  - Green: High confidence (consistent laps)
  - Yellow: Medium confidence
  - Orange: Low confidence (variable pace)

## Algorithm Details

### Break Lap Detection

Laps are considered "breaks" if:

- Lap time > 1.75 × median lap time
- Excludes these from prediction
- Ensures at least 3 valid laps remain

### Weighted Prediction

Uses last 5 valid laps with weights:

```
Oldest lap:   weight 1
2nd oldest:   weight 2
3rd oldest:   weight 3
2nd newest:   weight 4
Newest lap:   weight 5

Predicted time = Σ(lap_time × weight) / Σ(weights)
```

### Trend Adjustment

If runner is slowing (positive slope):

```
Linear regression on last 5 laps
If slope > 0:
  Add 10% of slope to prediction
```

### Crew Spot Time Calculation

```
Average pace = predicted_lap_time / lap_distance
Time offset = crew_offset_meters × pace
Time until crew spot = time_until_timing_mat - time_offset
```

## Testing

### With Simulation Mode

1. Enable simulation mode in admin
2. Generate mock data with various lap patterns
3. Navigate to `/live/countdown`
4. Verify predictions update every 5 seconds
5. Test with different crew offsets

### Test Cases

- [ ] Runners with consistent laps (should have high confidence)
- [ ] Runners with breaks (breaks should be excluded)
- [ ] Runners with declining pace (should predict slower)
- [ ] Positive crew offset (+200m)
- [ ] Negative crew offset (-150m)
- [ ] Watchlist with multiple runners
- [ ] Empty watchlist (should show empty state)
- [ ] Team with no runners (should show empty state)

## Files Changed

1. `migrations/026_add_crew_spot_offset.sql` - NEW
2. `types/live-race.ts` - UPDATED
3. `lib/live-race/lap-predictor.ts` - NEW
4. `app/api/race/countdown/route.ts` - NEW
5. `app/api/race/config/route.ts` - UPDATED
6. `components/live/CountdownCard.tsx` - NEW
7. `app/live/countdown/page.tsx` - NEW
8. `app/admin/race-live/page.tsx` - UPDATED
9. `components/live/LiveNavigation.tsx` - UPDATED
10. `lib/i18n/types.ts` - UPDATED
11. `lib/i18n/translations/en.ts` - UPDATED
12. `lib/i18n/translations/sv.ts` - UPDATED

## Next Steps

1. **Apply Database Migration**:

   - Run `026_add_crew_spot_offset.sql` in Supabase SQL editor

2. **Test with Simulation Data**:

   - Generate mock data in admin panel
   - Verify countdown predictions are accurate

3. **Adjust Default Offset**:

   - Set the default crew spot offset for your race
   - Communicate this to crew members

4. **Monitor Performance**:
   - Check API response times for countdown endpoint
   - Verify caching is working (5-second TTL)

## Future Enhancements (Not Implemented)

- [ ] Multiple crew spot presets (e.g., "Spot A", "Spot B")
- [ ] Per-runner customization of crew offset
- [ ] Historical prediction accuracy tracking
- [ ] Push notifications when runner is X minutes away
- [ ] Crew spot markers on map view

# Crew Countdown - Quick Start Guide

## 🎯 What's New

A new **Countdown** tab in the live section that shows when runners will next pass the timing mat and crew spots, with intelligent predictions based on recent lap performance.

## 🚀 Getting Started

### Step 1: Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add crew spot offset column
ALTER TABLE race_config
ADD COLUMN IF NOT EXISTS crew_spot_offset_meters INTEGER DEFAULT 0;
```

Or execute the migration file:

```bash
# File: migrations/026_add_crew_spot_offset.sql
```

### Step 2: Set Crew Spot Offset (Admin)

1. Go to `/admin/race-live`
2. Scroll to "Course Settings"
3. Find "Crew Spot Offset (meters)"
4. Enter your crew spot distance:
   - **+200** = 200 meters AFTER timing mat
   - **-150** = 150 meters BEFORE timing mat
5. Click "Update"

### Step 3: Test with Simulation Data

1. In `/admin/race-live`, generate mock data (e.g., 12 hours)
2. Navigate to `/live/countdown`
3. Select a country and gender
4. Watch the countdowns update in real-time!

## 📱 How Crews Use It

### Team View

1. Go to `/live` → Click "Countdown" tab
2. Select your country from dropdown
3. Select Men or Women
4. See all your team runners with live countdowns

### Watchlist View

1. First, add runners to watchlist from "Leaderboard" tab (click ⭐)
2. Go to "Countdown" tab → Click "Watchlist"
3. See countdowns for your selected runners

### Adjust Crew Spot Location

- Use **+** and **-** buttons to adjust by 10m
- Or type a value and press Enter
- Changes are local to your view only

## 🎨 Understanding the Display

Each runner card shows:

```
┌─────────────────────────────────────┐
│ #123  🇸🇪  Runner Name              │
│ Last Passing: 3 min ago             │
├─────────────────────────────────────┤
│ ▓▓▓▓▓▓▓░░░░░ (60% complete)         │
│ Est. Lap Time: 8:45                 │
├─────────────────────────────────────┤
│ 🕐 Timing Mat           5:25        │ ← Time until timing mat
├─────────────────────────────────────┤
│ 📍 Crew Spot (+200m)    4:30        │ ← Time until crew spot
└─────────────────────────────────────┘
```

### Color Codes

- **Normal (Blue/Gray)**: Countdown in progress
- **Red with "+"**: Overdue (e.g., +2:30 means 2:30 late)
- **Green Trend Icon**: High confidence prediction
- **Yellow Trend Icon**: Medium confidence
- **Orange + Warning**: Low confidence (inconsistent pace)

## 🧠 How the Prediction Works

### Smart Algorithm

1. **Analyzes last 10 laps** for each runner
2. **Detects break laps** (>175% of median) and excludes them
3. **Weights recent laps more** (newest lap counts 5x, oldest 1x)
4. **Adjusts for trends** (adds 10% if runner is slowing)
5. **Calculates confidence** based on lap consistency

### Example Calculation

```
Runner's last 5 laps: [8:20, 8:25, 8:30, 8:28, 8:32]
Weights:              [  1,    2,    3,    4,    5 ]

Weighted average = (8:20×1 + 8:25×2 + 8:30×3 + 8:28×4 + 8:32×5) / 15
                 ≈ 8:28

Trend: +3 sec per lap (slowing)
Adjustment: +0.3 sec (10% of slope)
Final prediction: 8:28.3

Confidence: High (CV < 0.15)
```

### Crew Spot Calculation

```
If lap distance = 821m and crew offset = +200m:
  Crew spot is at 200/821 = 24.4% of lap

If predicted lap time = 8:30 (510 seconds):
  Time to crew spot = 510 × (1 - 0.244) = 385.5 seconds
  = 6:25 from start of lap

If runner passed timing mat 3:00 ago:
  Time until crew spot = 6:25 - 3:00 = 3:25
```

## 🔧 Troubleshooting

### Countdown shows "+XX:XX" (Red)

- Runner is overdue (likely on a break)
- Prediction was based on normal laps, but runner took longer
- Will correct on next passing

### Low confidence warning

- Runner has inconsistent lap times
- May have had breaks or varying pace
- Prediction less reliable

### No countdown data

- Runner hasn't completed enough laps yet (need at least 2)
- No `last_passing` time recorded
- Check if runner is in the race

### Wrong crew spot time

- Check crew offset setting matches your actual location
- Verify lap distance is correct (default 0.821km)
- Admin can adjust in `/admin/race-live`

## 📊 Testing Checklist

- [ ] Database migration applied successfully
- [ ] Crew offset set in admin (e.g., +200m)
- [ ] Can view countdown for a team (country + gender)
- [ ] Can view countdown for watchlist runners
- [ ] Countdowns update every 5 seconds
- [ ] Can adjust crew offset with +/- buttons
- [ ] Overdue runners show red with "+"
- [ ] Confidence indicator shows on runners with variable pace
- [ ] Progress bar animates as lap progresses
- [ ] Translation works (English/Swedish)

## 🎉 That's It!

Your crew countdown is now live! Crew members can now:

- See exactly when their runners will arrive
- Plan assistance timing precisely
- Track multiple runners from watchlist
- Adjust for their exact crew location

## Need Help?

Check the full implementation details in:

- `CREW_COUNTDOWN_IMPLEMENTATION.md` - Complete technical documentation
- `/app/live/countdown` - Source code for the countdown page
- `/lib/live-race/lap-predictor.ts` - Prediction algorithm details

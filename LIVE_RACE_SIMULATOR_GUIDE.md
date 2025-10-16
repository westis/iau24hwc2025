# Live Race Simulator Guide

This guide shows you how to simulate a **real-time live race** where runners progressively complete laps as if the race is actually happening.

## What's the Difference?

### Static Mock Data (`npm run mock-live`)

- ❌ Creates a **snapshot** at a specific time (e.g., 12 hours into race)
- ❌ No updates, just static data
- ✅ Good for: Testing layouts and UI

### Live Simulator (`npm run simulate-live`)

- ✅ Starts from **hour 0** and progresses in real-time
- ✅ Runners complete laps progressively
- ✅ Leaderboard updates as laps are completed
- ✅ **Simulates actual timing mat crossings**
- ✅ Good for: Testing live updates, animations, real-time features

## Quick Start

### Start the Live Simulator

Open a **new terminal** (keep your dev server running) and run:

```bash
npm run simulate-live
```

This will:

1. Generate mock data for the full 24-hour race
2. Start from hour 0 (race start)
3. Progressively insert laps as they happen
4. Update the leaderboard every 5 seconds
5. Run at **60x speed** (1 real minute = 1 hour of race time)

### Watch the Live Page

Open your browser to:

```
http://localhost:3000/live
```

You'll see:

- ✅ Leaderboard starting empty
- ✅ Runners appearing as they complete their first lap
- ✅ Rankings changing as runners progress
- ✅ Real-time updates every 60 seconds (the page auto-refreshes)

## Speed Control

### Fast Simulation (Default)

```bash
npm run simulate-live       # 60x speed
npm run simulate-live 120   # 120x speed (full race in 12 minutes)
npm run simulate-live 240   # 240x speed (full race in 6 minutes)
```

### Slower for Detailed Testing

```bash
npm run simulate-live 10    # 10x speed (more visible updates)
npm run simulate-live 1     # Real-time speed (24 hours!)
```

## Limit Race Duration

Simulate only the first X hours:

```bash
npm run simulate-live 60 12    # 60x speed, first 12 hours only
npm run simulate-live 120 6    # 120x speed, first 6 hours only
npm run simulate-live 240 3    # 240x speed, first 3 hours only
```

## Example: Test the First Hour Quickly

```bash
npm run simulate-live 600 1
```

- **600x speed**: 1 real second = 10 race minutes
- **First 1 hour**: Complete simulation in 6 seconds
- Perfect for quick testing!

## Stopping Simulation Mode

### During Simulation (Ctrl+C)

When you press `Ctrl+C` while the simulator is running:

- ✅ Simulation stops immediately
- ✅ **Simulation mode is automatically disabled**
- ✅ Orange banner disappears
- ✅ Race clock resets to normal

### After Simulation Completes

If the simulation finishes naturally, simulation mode stays **ON** so you can:

- View the final results
- Test the UI with complete data
- Keep the simulated race clock

**To turn OFF simulation mode:**

```bash
npm run stop-sim
```

This will:

- ✅ Remove the orange "SIMULATION MODE" banner
- ✅ Reset the race clock
- ✅ Clear simulation state

### Check Simulation Status

To see if simulation mode is currently active:

```bash
npm run check-sim
```

This shows:

- Current race state
- Simulation mode status
- Current race time
- Number of runners in leaderboard

## Console Output

While running, you'll see:

```
🏁 IAU 24H World Championship - Live Race Simulator

⚡ Speed: 60x (1 real second = 60 race seconds)
⏱️  Duration: First 24 hours of race
🔄 Updates: Real-time as laps complete

⏸️  Press Ctrl+C to stop at any time

📊 Generating mock race data...
✅ Generated 2847 laps for 80 runners

🗑️  Clearing existing race data...
✅ Race data cleared
🔴 Race state: LIVE

🏃 Race started! Watch at: http://localhost:3000/live

──────────────────────────────────────────────────────────────────────
⏱️  Race time: 02:35:47 | Laps: 842/2847 | Real time: 156s | Runner #45 - Lap 8
```

## Stop the Simulation

Press **Ctrl+C** at any time to stop. The data up to that point will remain in your database.

## What to Test

With the live simulator running, you can test:

### Real-Time Features

- ✅ Auto-refresh behavior (page polls every 60 seconds)
- ✅ Leaderboard position changes
- ✅ New lap notifications
- ✅ Distance progression charts updating
- ✅ Team standings recalculating

### Live Page Features

- ✅ **Watchlist**: Add runners mid-race and watch their progress
- ✅ **Filters**: Switch between Overall/Men/Women views
- ✅ **Search**: Find specific runners as they progress
- ✅ **Expand Rows**: See lap-by-lap details building up
- ✅ **Charts**: Watch distance charts grow in real-time
- ✅ **Team View**: See team totals updating

### Performance

- ✅ Database performance with frequent inserts
- ✅ Caching behavior
- ✅ API response times
- ✅ Page load times with growing dataset

## Reset and Re-run

To reset and start a new simulation:

1. **Stop current simulation**: Press Ctrl+C
2. **Run again**: `npm run simulate-live`

The script automatically clears old data before starting.

## Recommended Testing Workflow

### 1. Quick First Hour Test

```bash
npm run simulate-live 600 1
```

Watch the first hour in 6 seconds to verify everything works.

### 2. Mid-Race Test

```bash
npm run simulate-live 120 12
```

Simulate 12 hours in 6 minutes to test mid-race features.

### 3. Full Race Test

```bash
npm run simulate-live 240
```

Run the full 24 hours in 6 minutes to test complete race flow.

### 4. Slow Motion Detailed Test

```bash
npm run simulate-live 10 1
```

Watch the first hour in slow-motion (6 minutes) to see every detail.

## Behind the Scenes

The simulator:

1. **Generates** realistic mock data for all runners
2. **Sorts** all laps chronologically by race time
3. **Progressively inserts** laps into the database as they "happen"
4. **Recalculates** leaderboard every 5 seconds
5. **Updates** all standings, ranks, and projections in real-time

## Troubleshooting

### Simulation runs too fast

- Lower the speed multiplier: `npm run simulate-live 30`

### Simulation runs too slow

- Increase the speed multiplier: `npm run simulate-live 240`

### Not seeing updates on /live page

- The page auto-refreshes every 60 seconds
- Manually refresh to see immediate updates
- Check browser console for errors

### Error: "Cannot connect to API"

- Make sure your dev server is running: `npm run dev`
- Check that you're using the correct URL (default: localhost:3000)

### Want to start over

- Press Ctrl+C to stop
- Run the command again (it auto-clears old data)

## Production Note

⚠️ **This is for development/testing only!**

In production:

- Real timing data comes from your actual timing system
- No simulation needed
- The same `/live` page displays real race data

## Next Steps

After testing with the simulator:

1. ✅ Verify all live features work as expected
2. ✅ Test performance with full dataset
3. ✅ Check mobile responsiveness during "live" updates
4. ✅ Validate caching and refresh strategies
5. ✅ Set up your real timing system integration

Enjoy testing your live race features! 🏁

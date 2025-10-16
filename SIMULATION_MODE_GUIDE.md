# Simulation Mode Guide

## What is Simulation Mode?

Simulation Mode allows you to test the live race features with **realistic, progressive data** that updates in real-time, complete with:

- ✅ **Ticking Race Clock** - Shows simulated elapsed time
- ✅ **Progressive Lap Data** - Runners complete laps one by one
- ✅ **Live Updates** - Leaderboard refreshes as new laps are recorded
- ✅ **Visible Banner** - Orange "SIMULATION MODE" banner alerts users

## How It Works

When you run the live simulator:

1. **Simulation Mode Activates** - A flag is set in the database
2. **Race Clock Uses Simulation Time** - Instead of real time, it uses the simulated race time
3. **Banner Appears** - An orange banner shows on all live pages
4. **Data Updates Progressively** - Laps are inserted as they "happen" in simulation
5. **Everything Looks Live** - But users know it's a simulation

## Quick Start

### Start Simulation

```bash
npm run simulate-live
```

This will:

- Enable simulation mode
- Set race clock to start from 0:00:00
- Progressively add lap data
- Update the simulated race time every 5 seconds
- Keep the simulation clock ticking

### What You'll See

**Orange Banner:**

```
⚠️ SIMULATION MODE - This is not live race data. The race clock and data are simulated for testing purposes.
```

**Race Clock:**

```
🔴 Elapsed Time (SIM)
02:35:47
21:24:13 remaining
```

**Leaderboard:**

- Starts with 10 runners (or fewer if simulation just started)
- Distances increase as laps complete
- Rankings change in real-time
- Load +10, +50, or all runners

## During Simulation

### What Updates in Real-Time

1. **Race Clock** - Ticks forward based on simulation time (not real time)
2. **Leaderboard** - Updates every 5 seconds with new lap data
3. **Rankings** - Recalculated as runners complete laps
4. **Distance** - Increases by ~0.821 km per lap
5. **Projections** - Updated based on current pace

### What to Test

- ✅ **Auto-refresh** - Page polls every 60 seconds
- ✅ **Manual refresh** - See immediate updates
- ✅ **Watchlist** - Add runners mid-simulation
- ✅ **Filters** - Switch between Overall/Men/Women
- ✅ **Search** - Find specific runners
- ✅ **Pagination** - Load more runners
- ✅ **Charts** - Watch distance graphs grow
- ✅ **Team view** - See team totals updating
- ✅ **Mobile** - Test responsive design

## Stopping Simulation

### Method 1: Run Simulator Again

```bash
npm run simulate-live
```

This clears old data and starts a fresh simulation.

### Method 2: Admin Panel

Go to `/admin/race-live` and:

1. Go to "Race Control" tab
2. Click "Not Started" or "Finish Race"
3. Simulation mode automatically turns off

### Method 3: Manual API Call

```bash
curl -X PATCH http://localhost:3000/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"simulationMode": false}'
```

## Simulation vs Real Race

| Feature         | Simulation Mode        | Real Race                 |
| --------------- | ---------------------- | ------------------------- |
| Race Clock      | Simulated time         | Real time from race start |
| Banner          | Orange "SIMULATION"    | No banner                 |
| Data Source     | Mock generated data    | Real timing system        |
| Clock indicator | "(SIM)" label          | No label                  |
| Updates         | Progressive simulation | Live timing feed          |

## Speed Control

The simulator runs at configurable speed:

```bash
# Default: 60x speed (24-hour race in 24 minutes)
npm run simulate-live

# Faster: 240x speed (24-hour race in 6 minutes)
npm run simulate-live 240

# Slower: 10x speed (easier to watch)
npm run simulate-live 10

# Partial race: First 6 hours only at 120x speed
npm run simulate-live 120 6
```

## Technical Details

### Database Fields

**race_config** table:

- `simulation_mode` (boolean) - Whether simulation is active
- `current_race_time_sec` (integer) - Current simulated race time in seconds
- `simulation_start_time` (timestamp) - When simulation started

### API Updates

The simulator updates:

- `/api/race/config` - Every 5 seconds with new `current_race_time_sec`
- `/api/race/insert-lap` - As each lap completes
- `/api/race/update-leaderboard` - Every 5 seconds

### Frontend Polling

- Race config: Every 5 seconds (for clock updates)
- Leaderboard: Every 60 seconds (or manual refresh)
- Simulation mode status: Every 10 seconds

## Troubleshooting

### Clock Not Updating

- Check that simulation_mode is true in race_config
- Verify current_race_time_sec is being updated
- Refresh the page
- Check browser console for errors

### Banner Not Showing

- Simulation mode may be off
- Check `/api/race/config` returns `simulation_mode: true`
- Clear browser cache

### Data Not Progressive

- Old data may still be in database
- Run simulator again to clear and restart
- Check console logs for lap insertion

### Clock Shows Wrong Time

- Simulation uses `current_race_time_sec`, not real time
- If simulation stopped, the clock freezes at last value
- Run simulator again to reset

## Best Practices

### For Development

1. **Quick Tests**: Use 600x speed for 1-hour tests (6 seconds total)
2. **Feature Testing**: Use 60-120x speed for reasonable viewing
3. **Detailed Inspection**: Use 10x speed to see each update clearly

### For Demonstrations

1. **Start Fresh**: Always run simulator from clean state
2. **Announce Simulation**: Make it clear it's not real race data
3. **Show Progression**: Let it run for at least 30 seconds so people see updates
4. **Explain Banner**: Point out the simulation mode indicator

### Before Production

1. **Test Full Race**: Run 24-hour simulation at 240x (6 minutes)
2. **Verify All Features**: Test everything during simulation
3. **Check Performance**: Ensure database handles the load
4. **Test Shutdown**: Verify simulation mode turns off cleanly

## Examples

### Quick Feature Demo (30 seconds)

```bash
npm run simulate-live 720 1  # First hour in 30 seconds
```

### Detailed Testing (10 minutes)

```bash
npm run simulate-live 144 12  # 12 hours in 10 minutes
```

### Full Race Test (6 minutes)

```bash
npm run simulate-live 240 24  # Full race in 6 minutes
```

### Realistic Pace (24 minutes)

```bash
npm run simulate-live  # Default 60x, full race in 24 minutes
```

## When Simulation Mode is Active

**You'll Know Because:**

1. 🟠 Orange banner at top of all live pages
2. 🔴 "(SIM)" label next to race clock
3. ⏱️ Clock ticks forward based on simulation time
4. 📊 Data updates progressively, not all at once

**When Real Race is Live:**

1. ✅ No banner
2. ✅ No "(SIM)" label
3. ⏱️ Clock uses actual race start/end times
4. 📊 Data comes from timing system

This makes it crystal clear to everyone whether they're seeing real or simulated data!


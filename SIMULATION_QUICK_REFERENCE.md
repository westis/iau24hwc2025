# Simulation Mode - Quick Reference

## Common Commands

```bash
# Start a simulation (60x speed, full 24h race)
npm run simulate-live

# Start a simulation (120x speed, only 12 hours)
npm run simulate-live 120 12

# Check if simulation mode is active
npm run check-sim

# Stop simulation (disables flag, removes banner)
npm run stop-sim

# Clear simulation data only (interactive with confirmation)
npm run clear-sim-data

# Clear simulation data (force mode, no confirmation)
npm run clear-sim-data --force
```

## What Each Command Does

### `npm run simulate-live`
- Enables `simulation_mode = true`
- Sets `simulation_start_time = NOW()`
- Generates mock race data
- Inserts data in real-time at accelerated speed
- Shows orange "SIMULATION MODE" banner on live pages

### `npm run check-sim`
- Displays current simulation mode status
- Shows race state and current race time
- No modifications to database

### `npm run stop-sim`
- Disables `simulation_mode = false`
- Clears ALL simulation data automatically
- Resets race clock to 0
- Removes orange banner
- **RECOMMENDED**: Use this to clean up after simulation

### `npm run clear-sim-data`
- Interactive script with confirmation prompt
- Shows what will be deleted vs. preserved
- Only clears simulation data (timestamp-based)
- Can be run with `--force` to skip confirmation

## Safety Features

### How Real Data is Protected

1. **Simulation Mode Flag**
   - Must be enabled to create/clear simulation data
   - Prevents accidental deletion when flag is off

2. **Timestamp Tracking**
   - `simulation_start_time` marks when simulation began
   - Only data created AFTER this time is considered simulation data
   - Real data (created before) is never touched

3. **Confirmation Prompts**
   - Interactive mode requires explicit "yes" confirmation
   - Shows detailed preview before deletion
   - Use `--force` only when certain

### What Gets Deleted

✅ **SAFE TO DELETE (Simulation Data)**
- Lap times created during simulation
- Leaderboard entries from simulation
- Race updates generated during simulation
- Simulation mode flags and timers

### What Gets Preserved

🛡️ **NEVER DELETED (Real Data)**
- Runner information (names, countries, bibs)
- Race configuration (course, distance, settings)
- Race info (name, date, location)
- Teams data
- News articles
- Chat messages
- Any data created BEFORE simulation started

## Workflow Examples

### Testing a New Feature

```bash
# 1. Start simulation to generate test data
npm run simulate-live 60 6  # 6 hours at 60x speed (6 minutes real time)

# 2. Test your feature on /live pages
# ... open browser, test UI, verify functionality ...

# 3. Stop and clean up when done
npm run stop-sim  # Stops simulation AND clears data
```

### Quick Data Check

```bash
# Check simulation status without making changes
npm run check-sim
```

**Output:**
```
Simulation Mode: ENABLED
Race State: live
Current Race Time: 12h 34m
Simulation Started: 2025-01-15 10:23:45 AM
```

### Clearing Data Only (Keep Simulation Running)

```bash
# If you want to clear data but keep simulation mode on
# (Advanced use case - not common)

# 1. Clear data interactively
npm run clear-sim-data

# Note: This will disable simulation mode as a side effect
# You'll need to run simulate-live again to re-enable
```

## API Endpoints

### Clear Simulation Data
```bash
POST /api/race/clear-simulation
Content-Type: application/json

{
  "raceId": 1,
  "simulationStartTime": "2025-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "lapsDeleted": 1247,
  "leaderboardDeleted": 45,
  "updatesDeleted": 23
}
```

### Update Race Config
```bash
PATCH /api/race/config
Content-Type: application/json

{
  "simulationMode": false,
  "currentRaceTimeSec": 0
}
```

## Troubleshooting

### "Cannot clear data: Simulation mode is not enabled"

**Why:** Safety feature to prevent accidental real data deletion.

**Solution:** This is correct behavior. If simulation mode is off, there's no simulation data to clear.

### "No changes to database"

**Why:** Simulation mode is already off or no simulation data exists.

**Solution:** This is safe. The system verified there's nothing to clear.

### Real data was accidentally deleted (SHOULD NEVER HAPPEN)

**Prevention:** Multiple safety layers prevent this:
- Simulation mode flag check
- Timestamp-based filtering
- Confirmation prompts

**If it happens:**
1. Restore from database backup
2. Report the issue (this is a bug)
3. Check logs for investigation

## Database Queries (For Debugging)

### Check simulation mode status
```sql
SELECT
  simulation_mode,
  simulation_start_time,
  current_race_time_sec,
  race_state
FROM race_config
WHERE race_id = 1;
```

### Count simulation data
```sql
-- Count laps created during simulation
SELECT COUNT(*) FROM race_laps
WHERE race_id = 1
AND created_at >= (
  SELECT simulation_start_time FROM race_config WHERE race_id = 1
);

-- Count leaderboard entries
SELECT COUNT(*) FROM race_leaderboard
WHERE race_id = 1
AND created_at >= (
  SELECT simulation_start_time FROM race_config WHERE race_id = 1
);
```

### Manually disable simulation mode (Emergency)
```sql
UPDATE race_config
SET simulation_mode = false,
    current_race_time_sec = 0,
    simulation_start_time = null
WHERE race_id = 1;
```

## Best Practices

1. **Always use `npm run stop-sim`** instead of manually clearing
   - It handles everything correctly
   - Disables mode + clears data in one command

2. **Check simulation status before/after operations**
   ```bash
   npm run check-sim  # Before
   npm run stop-sim   # Clear
   npm run check-sim  # Verify after
   ```

3. **Use appropriate speeds for testing**
   - `60x` = Good for quick tests (1 hour = 1 minute)
   - `120x` = Very fast (1 hour = 30 seconds)
   - `1x` = Real-time (only for integration testing)

4. **Limit simulation duration for testing**
   ```bash
   # Test with just 6 hours of data instead of full 24h
   npm run simulate-live 60 6
   ```

5. **Don't run simulations on production**
   - Only use in development/staging environments
   - Real production data could be at risk

## Files Modified

This implementation added/modified:

```
iau24hwc-app/
├── package.json                                    [MODIFIED]
│   └── Added: "stop-sim", "clear-sim-data" scripts
├── scripts/
│   ├── stop-simulation.ts                          [EXISTING]
│   └── clear-simulation-data.ts                    [NEW]
├── app/api/race/
│   ├── clear/route.ts                              [MODIFIED]
│   └── clear-simulation/route.ts                   [NEW]
├── migrations/
│   └── add_simulation_mode.sql                     [EXISTING]
└── SIMULATION_DATA_CLEARING.md                     [NEW]
```

## Summary

**Quick Answer:** Use `npm run stop-sim` to clean up after testing. It's safe, automatic, and handles everything.

**Safety:** Multiple layers protect real data. Simulation data is clearly marked by timestamps and can only be deleted when simulation mode is/was enabled.

**Verification:** Run `npm run check-sim` anytime to see current status.

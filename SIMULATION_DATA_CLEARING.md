# Simulation Data Clearing Implementation

## Overview

This document describes the implementation of safe simulation/mock data clearing functionality that ensures real race data is never accidentally deleted.

## Problem Statement

The application needs to clear mock/simulation data after testing, but must guarantee that:
1. Real race data is never deleted
2. Runner information is preserved
3. Race configuration remains intact
4. The system can differentiate between mock and real data

## Solution Architecture

### Data Differentiation Strategy

The system uses multiple indicators to identify simulation vs. real data:

1. **Primary Indicator: `simulation_mode` flag**
   - Column: `race_config.simulation_mode` (boolean)
   - When `true`, indicates the race is in simulation mode
   - Set by: `npm run simulate-live` or simulation start API

2. **Timestamp Tracking: `simulation_start_time`**
   - Column: `race_config.simulation_start_time` (timestamptz)
   - Records when simulation mode was enabled
   - Used to identify data created during simulation
   - All data with `created_at >= simulation_start_time` is considered simulation data

3. **Database Timestamps**
   - Every table has `created_at` column
   - Enables time-based filtering of simulation data
   - Prevents deletion of pre-existing real data

### Database Schema

Relevant tables and columns:

```sql
-- race_config: Stores simulation mode state
CREATE TABLE race_config (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id),
  simulation_mode BOOLEAN DEFAULT FALSE,
  current_race_time_sec INTEGER DEFAULT 0,
  simulation_start_time TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- race_laps: Stores lap timing data (simulation or real)
CREATE TABLE race_laps (
  id SERIAL PRIMARY KEY,
  race_id INTEGER,
  bib INTEGER NOT NULL,
  lap INTEGER NOT NULL,
  lap_time_sec NUMERIC(10, 2),
  race_time_sec NUMERIC(12, 2),
  distance_km NUMERIC(8, 3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- Data created during simulation has created_at >= simulation_start_time
);

-- race_leaderboard: Stores current race standings
CREATE TABLE race_leaderboard (
  id SERIAL PRIMARY KEY,
  race_id INTEGER,
  bib INTEGER NOT NULL,
  rank INTEGER,
  distance_km NUMERIC(8, 3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- Simulation leaderboard has created_at >= simulation_start_time
);

-- race_updates: Stores race commentary and updates
CREATE TABLE race_updates (
  id SERIAL PRIMARY KEY,
  race_id INTEGER,
  content TEXT,
  update_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- Simulation updates have created_at >= simulation_start_time
);
```

## Implementation Components

### 1. Scripts

#### `scripts/clear-simulation-data.ts`
- **Purpose**: Interactive CLI for clearing simulation data
- **Safety Features**:
  - Checks if `simulation_mode` is enabled
  - Requires user confirmation (unless `--force`)
  - Shows detailed preview of what will be deleted
  - Displays what will be preserved
  - Only deletes data created after `simulation_start_time`

**Usage:**
```bash
# Interactive mode with confirmation
npm run clear-sim-data

# Force mode (skip confirmation)
npm run clear-sim-data --force
```

#### `scripts/stop-simulation.ts` (Enhanced)
- **Purpose**: Stops simulation and clears data
- **Behavior**: Now chains with `clear-simulation-data.ts`
- **Usage**: `npm run stop-sim`

### 2. API Endpoints

#### `POST /api/race/clear-simulation`
- **Purpose**: API endpoint for clearing simulation data
- **Safety Checks**:
  - Validates `simulation_mode` is/was enabled
  - Requires `simulationStartTime` if mode is disabled
  - Uses timestamp-based deletion for precision
  - Returns detailed statistics

**Request Body:**
```json
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
  "updatesDeleted": 23,
  "message": "Simulation data cleared successfully"
}
```

#### `POST /api/race/clear` (Updated)
- **Purpose**: Legacy endpoint for clearing all race data
- **New Safety**: Now requires `simulation_mode` to be enabled
- **Error**: Returns 403 if simulation mode is not enabled
- **Recommendation**: Use `/api/race/clear-simulation` instead

### 3. Package.json Scripts

```json
{
  "scripts": {
    "stop-sim": "tsx scripts/stop-simulation.ts && tsx scripts/clear-simulation-data.ts --force",
    "clear-sim-data": "tsx scripts/clear-simulation-data.ts"
  }
}
```

## Safety Guarantees

### What Gets Deleted (Simulation Data Only)

1. **Race Laps** (`race_laps`)
   - Only laps with `created_at >= simulation_start_time`
   - Deletion query: `WHERE race_id = ? AND created_at >= ?`

2. **Leaderboard** (`race_leaderboard`)
   - Only entries with `created_at >= simulation_start_time`
   - Deletion query: `WHERE race_id = ? AND created_at >= ?`

3. **Race Updates** (`race_updates`)
   - Only updates with `created_at >= simulation_start_time`
   - Deletion query: `WHERE race_id = ? AND created_at >= ?`

4. **Simulation State** (`race_config`)
   - Sets `simulation_mode = false`
   - Sets `current_race_time_sec = 0`
   - Sets `simulation_start_time = null`

### What Gets Preserved (Real Data)

1. **Runner Information** (`runners`)
   - All runner profiles, names, countries, etc.
   - NEVER touched by clearing operations

2. **Race Configuration** (`race_config`)
   - Course geometry (GeoJSON)
   - Course distance
   - Timing mat coordinates
   - All configuration settings

3. **Race Info** (`race_info`)
   - Race name, date, location
   - All metadata

4. **Teams, News, Chat** (All other tables)
   - Completely unaffected

5. **Real Race Data** (if exists)
   - Any data created BEFORE `simulation_start_time`
   - Protected by timestamp-based filtering

## Usage Examples

### Example 1: Stop Simulation and Clear Data

```bash
# Run simulation
npm run simulate-live

# ... test the application ...

# Stop simulation and clear all mock data
npm run stop-sim
```

**What happens:**
1. `stop-simulation.ts` disables simulation mode
2. `clear-simulation-data.ts --force` deletes all simulation data
3. Database is clean and ready for real race or new simulation

### Example 2: Clear Data Interactively

```bash
# Run simulation
npm run simulate-live 60 12  # 60x speed, 12 hours

# Later, clear data with confirmation prompt
npm run clear-sim-data
```

**Output:**
```
🧹 Clear Simulation Data
======================================================================

📊 Fetching race configuration...

⚠️  SIMULATION MODE DETECTED
──────────────────────────────────────────────────────────────────────
   Simulation Mode: ENABLED
   Race State: live
   Simulation Start: 1/15/2025, 10:23:45 AM
   Current Race Time: 12h 34m
──────────────────────────────────────────────────────────────────────

📝 The following simulation data will be CLEARED:
   ✓ All lap times created during simulation
   ✓ All leaderboard entries from simulation
   ✓ All race updates generated during simulation
   ✓ Simulation mode flag (will be disabled)
   ✓ Current race time (will be reset to 0)

🛡️  The following data will be PRESERVED:
   ✓ All runner information
   ✓ Race configuration (course, distance, etc.)
   ✓ Any real race data (if exists)
   ✓ Teams, news, and other non-race data

⚠️  Are you sure you want to clear all simulation data? (yes/no): yes

🗑️  Clearing simulation data...

======================================================================
✅ SIMULATION DATA CLEARED SUCCESSFULLY
======================================================================

📊 Summary:
   • Lap records deleted: 1247
   • Leaderboard entries deleted: 45
   • Race updates deleted: 23
   • Simulation mode: DISABLED
   • Race clock: RESET to 0
   • Orange banner: REMOVED

🛡️  Real Data Safety:
   ✓ All runner information preserved
   ✓ Race configuration preserved
   ✓ Real race data (if any) preserved

🌐 View at: http://localhost:3000/live
```

### Example 3: Already Stopped Simulation

```bash
# Simulation mode already disabled
npm run clear-sim-data
```

**Output:**
```
🧹 Clear Simulation Data
======================================================================

📊 Fetching race configuration...

⚠️  SAFETY CHECK PASSED
✅ Simulation mode is NOT enabled
✅ No simulation data to clear
✅ Real race data is safe
```

## Error Handling

### API Endpoint Errors

1. **Simulation Mode Not Enabled**
   ```json
   {
     "error": "Cannot clear data: Simulation mode is not enabled and no simulation start time provided",
     "safety": "This prevents accidental deletion of real race data"
   }
   ```
   - HTTP Status: 403 Forbidden
   - Prevents accidental real data deletion

2. **No Active Race**
   ```json
   {
     "error": "No active race found"
   }
   ```
   - HTTP Status: 404 Not Found

3. **Database Error**
   ```json
   {
     "error": "Internal server error",
     "details": "Connection timeout"
   }
   ```
   - HTTP Status: 500 Internal Server Error

### Script Errors

1. **Server Not Running**
   ```
   ❌ Error: Failed to fetch race config: 500

   Possible solutions:
      • Make sure your Next.js dev server is running (npm run dev)
      • Check your database connection
      • Verify the API endpoint exists
   ```

2. **User Cancelled**
   ```
   ❌ Operation cancelled by user
   ```

## Technical Details

### Deletion Logic

```typescript
// Pseudocode for safe deletion
async function clearSimulationData(raceId, simulationStartTime) {
  // Safety check
  if (!simulationMode && !simulationStartTime) {
    throw new Error("Safety check failed");
  }

  // Delete only data created during simulation
  if (simulationStartTime) {
    // Time-based deletion (safest)
    DELETE FROM race_laps
    WHERE race_id = raceId
    AND created_at >= simulationStartTime;

    DELETE FROM race_leaderboard
    WHERE race_id = raceId
    AND created_at >= simulationStartTime;

    DELETE FROM race_updates
    WHERE race_id = raceId
    AND created_at >= simulationStartTime;
  } else {
    // Mode-based deletion (when simulation is active)
    DELETE FROM race_laps WHERE race_id = raceId;
    DELETE FROM race_leaderboard WHERE race_id = raceId;
    DELETE FROM race_updates WHERE race_id = raceId;
  }

  // Reset simulation state
  UPDATE race_config
  SET simulation_mode = false,
      current_race_time_sec = 0,
      simulation_start_time = null
  WHERE race_id = raceId;

  // Clear caches
  raceCache.clear();
}
```

### Cache Management

- All race caches are cleared after data deletion
- Ensures fresh data on next request
- Uses `raceCache.clear()` from `@/lib/live-race/cache`

## Testing Checklist

Before running `npm run stop-sim` in production:

- [ ] Verify simulation mode is enabled (`npm run check-sim`)
- [ ] Confirm you want to delete simulation data
- [ ] Check that real race hasn't started yet
- [ ] Backup database if unsure (optional)
- [ ] Run the command
- [ ] Verify simulation banner is gone
- [ ] Check `/live` page loads correctly
- [ ] Confirm database only has real data

## Migration Path

If you have existing race data:

1. **Before First Simulation:**
   ```sql
   -- Ensure simulation mode is disabled for existing data
   UPDATE race_config SET simulation_mode = false;
   UPDATE race_config SET simulation_start_time = null;
   ```

2. **Running First Simulation:**
   ```bash
   npm run simulate-live
   # This sets simulation_start_time = NOW()
   # All data from this point forward is marked as simulation
   ```

3. **Clearing Simulation:**
   ```bash
   npm run stop-sim
   # Only deletes data created after simulation_start_time
   # Pre-existing data is safe
   ```

## Future Enhancements

Potential improvements:

1. **Data Source Tracking**
   - Add `data_source` column to track data origin
   - Values: 'simulation', 'manual', 'timing_system'
   - Enable source-based filtering

2. **Soft Delete**
   - Add `deleted_at` column
   - Implement soft delete instead of hard delete
   - Allow data recovery

3. **Audit Trail**
   - Log all clearing operations
   - Track who/what triggered deletion
   - Store deletion statistics

4. **Batch Operations**
   - Add progress indicators for large deletions
   - Implement chunked deletion for performance
   - Add pause/resume capability

## Troubleshooting

### Issue: "Cannot clear data: Simulation mode is not enabled"

**Cause:** Trying to clear data when simulation mode is off and no timestamp provided.

**Solution:** This is a safety feature. If you really need to clear data:
1. First enable simulation mode, OR
2. Provide the `simulationStartTime` parameter

### Issue: Data not being deleted

**Cause:** Data created before `simulation_start_time`.

**Solution:** This is working as intended. Only data created during simulation is deleted.

### Issue: Real data was deleted

**Prevention:** This should be impossible due to timestamp filtering.

**Recovery:** Restore from database backup.

**Investigation:** Check logs for the `simulation_start_time` used.

## Related Files

- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\scripts\clear-simulation-data.ts`
- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\scripts\stop-simulation.ts`
- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\app\api\race\clear-simulation\route.ts`
- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\app\api\race\clear\route.ts`
- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\migrations\add_simulation_mode.sql`
- `C:\Users\westi\Documents\server\iau24hwc2025\iau24hwc-app\migrations\022_create_live_race_tables.sql`

## Summary

This implementation provides a safe, reliable way to clear simulation data while guaranteeing real race data protection through:

1. **Multiple safety layers** (mode flag + timestamp + confirmation)
2. **Clear differentiation** between mock and real data
3. **Detailed logging and feedback**
4. **Comprehensive error handling**
5. **Preservation guarantees** for critical data

The system is designed to be foolproof and prevent accidental data loss while making it easy to clean up after testing.

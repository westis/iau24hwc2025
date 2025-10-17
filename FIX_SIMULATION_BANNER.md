# FIX: Orange Simulation Banner Not Showing

## The Problem

You're running `npm run simulate-live` but **NO ORANGE BANNER** appears! 😡

## The Fix (2 Steps)

### Step 1: Add Database Columns

The `simulation_mode` columns might be missing from your database.

#### Using Supabase Dashboard:

1. Go to your Supabase project
2. Click "SQL Editor" in the left menu
3. Click "New Query"
4. **Copy and paste this SQL:**

```sql
-- Add simulation mode fields to race_config table
ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS simulation_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS current_race_time_sec INTEGER DEFAULT 0;

ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS simulation_start_time TIMESTAMPTZ;
```

5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

#### Or Using Terminal:

```bash
# Connect to Supabase and run the migration
psql $DATABASE_URL < migrations/add_simulation_mode.sql
```

### Step 2: Verify It's Working

Run this debug command:

```bash
npm run check-sim
```

You should see:

```
🔍 Checking Simulation Mode Status...

📊 Race Config:
──────────────────────────────────────────────────
Race State: live
Simulation Mode: ❌ OFF    ← Currently off
Current Race Time: 0 seconds
Simulation Start: NOT SET
──────────────────────────────────────────────────
```

### Step 3: Start Simulation

Now run:

```bash
npm run simulate-live
```

### Step 4: Check Again

```bash
npm run check-sim
```

Now you should see:

```
📊 Race Config:
──────────────────────────────────────────────────
Race State: live
Simulation Mode: ✅ ON    ← Now ON!
Current Race Time: 1234 seconds
Simulation Start: 2025-01-15T10:30:00Z
──────────────────────────────────────────────────

✅ Simulation Mode is ON!

The orange banner should appear at:
   http://localhost:3000/live
```

### Step 5: View the Banner

Go to: `http://localhost:3000/live`

**Hard refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

You should now see:

```
╔═══════════════════════════════════════════════════════╗
║ ⚠️  SIMULATION MODE                                   ║
║ This is not live race data. The race clock and data  ║
║ are simulated for testing purposes.                  ║
╚═══════════════════════════════════════════════════════╝
```

## Quick Troubleshooting

### Still no banner? Try this:

#### 1. Check Browser Console

Press `F12` → Console tab

Look for errors. Common ones:
- `Failed to fetch /api/race/config` → Dev server not running
- Network errors → Check URL is correct

#### 2. Manual API Check

Open this URL in your browser:
```
http://localhost:3000/api/race/config
```

You should see JSON with:
```json
{
  "simulation_mode": true,  ← Must be true!
  "race_state": "live",
  "current_race_time_sec": 1234
}
```

If `simulation_mode` is **false or missing**, run Step 1 again.

#### 3. Force Enable via API

If the simulator isn't setting it, do it manually:

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/race/config" `
  -Method PATCH `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"simulationMode": true, "currentRaceTimeSec": 0}'
```

**Mac/Linux Terminal:**
```bash
curl -X PATCH http://localhost:3000/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"simulationMode": true, "currentRaceTimeSec": 0}'
```

#### 4. Check React Component

Open browser DevTools (F12) → React DevTools

Look for `<SimulationBanner>` component. Is it rendering?

If you see it but it's not visible, check CSS:
- Banner has: `bg-orange-500/10 border-orange-500/30`
- Text has: `text-orange-600 dark:text-orange-400`

#### 5. Clear Everything and Start Fresh

```bash
# Stop simulator (Ctrl+C)
# Stop dev server (Ctrl+C)

# Clear browser cache
# Close all browser tabs

# Restart dev server
npm run dev

# In new terminal, run simulator
npm run simulate-live

# Open fresh browser window
http://localhost:3000/live
```

## Common Mistakes

❌ **Running simulator without dev server**
```bash
npm run simulate-live  # ← Fails if no dev server!
```

✅ **Correct order:**
```bash
# Terminal 1:
npm run dev

# Terminal 2 (new window):
npm run simulate-live
```

❌ **Not refreshing browser**
- Changes don't appear automatically
- Must refresh: `Ctrl+Shift+R`

❌ **Wrong URL**
- Banner only shows on `/live` pages
- Not on `/` or other pages

## What Each File Does

| File | Purpose |
|------|---------|
| `components/live/SimulationBanner.tsx` | The orange banner component |
| `app/live/page.tsx` | Checks `simulationMode` and shows banner |
| `scripts/simulate-live-race.ts` | Sets `simulationMode: true` in DB |
| `app/api/race/config/route.ts` | API to get/set simulation mode |
| `migrations/add_simulation_mode.sql` | Adds DB columns |

## Still Stuck?

Run the check command and send me the output:

```bash
npm run check-sim
```

Also check:
1. Is dev server running? (`npm run dev`)
2. Can you access `http://localhost:3000`?
3. Any errors in terminal where simulator is running?
4. Any errors in browser console (F12)?

That banner WILL appear, I promise! 🎯






# How to See the Simulation Banner

## The Simple Answer

**You don't need to do anything special!** Just run this command:

```bash
npm run simulate-live
```

**That's it!** The orange banner will appear automatically.

## Step-by-Step Visual Guide

### Step 1: Open Your Terminal

Make sure you're in the `iau24hwc-app` directory:

```bash
cd iau24hwc-app
```

### Step 2: Make Sure Dev Server is Running

In one terminal window:

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

### Step 3: Open a NEW Terminal Window

Keep the dev server running, and open a **second terminal window**.

### Step 4: Run the Simulator

In the new terminal:

```bash
npm run simulate-live
```

You'll see this output:

```
🏁 IAU 24H World Championship - Live Race Simulator

⚡ Speed: 60x (1 real second = 60 race seconds)
⏱️  Duration: First 24 hours of race
🔄 Updates: Real-time as laps complete

📊 Generating mock race data...
✅ Generated 2847 laps for 80 runners

🗑️  Clearing existing race data...
✅ Race data cleared
🔴 Race state: LIVE (SIMULATION MODE)    ← See this!

🏃 Race started! Watch at: http://localhost:3000/live
```

### Step 5: Open Your Browser

Go to: `http://localhost:3000/live`

**You should see:**

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ SIMULATION MODE - This is not live race data.       │
│    The race clock and data are simulated for testing.  │
└─────────────────────────────────────────────────────────┘
```

## If You DON'T See the Banner

### Check 1: Is Simulation Running?

Look at the terminal where you ran `npm run simulate-live`. 

You should see:
```
⏱️  Race time: 00:15:23 | Laps: 142/2847 | Real time: 23s | Runner #45 - Lap 3
```

If you see "✅ Simulation complete!", it finished already. Run it again.

### Check 2: Refresh Your Browser

Sometimes you need to refresh the page:
- Press `F5` or `Ctrl+R` (Windows/Linux)
- Press `Cmd+R` (Mac)

### Check 3: Check Browser Console

Open browser DevTools (F12) and look for errors.

### Check 4: Verify Simulation Mode is ON

Visit this URL directly in your browser:
```
http://localhost:3000/api/race/config
```

You should see:
```json
{
  "simulation_mode": true,    ← Should be true!
  "current_race_time_sec": 1234,
  "race_state": "live"
}
```

If `simulation_mode` is `false`, the banner won't show.

## Manual Control (Advanced)

### Turn Simulation Mode ON Manually

If you want to turn it on without running the full simulator:

```bash
curl -X PATCH http://localhost:3000/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"simulationMode": true, "currentRaceTimeSec": 0}'
```

### Turn Simulation Mode OFF Manually

```bash
curl -X PATCH http://localhost:3000/api/race/config \
  -H "Content-Type: application/json" \
  -d '{"simulationMode": false}'
```

### Using Admin Panel

Go to: `http://localhost:3000/admin/race-live`

1. Click "Race Control" tab
2. Click "Not Started" button
3. This turns off simulation mode

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Banner doesn't appear | Refresh browser, check simulation is running |
| Banner shows when it shouldn't | Turn off simulation mode via admin panel |
| "Simulation complete" message | Run `npm run simulate-live` again |
| Can't see changes | Clear browser cache and refresh |

## What the Banner Looks Like

**Light Mode:**
```
┌────────────────────────────────────────────────┐
│ ⚠️ [Orange background]                         │
│ SIMULATION MODE - This is not live race data.  │
└────────────────────────────────────────────────┘
```

**Dark Mode:**
```
┌────────────────────────────────────────────────┐
│ ⚠️ [Orange/amber background]                   │
│ SIMULATION MODE - This is not live race data.  │
└────────────────────────────────────────────────┘
```

## Remember

✅ **Simulation Mode = Automatic**
- Run `npm run simulate-live`
- Banner appears automatically
- No manual setup needed!

❌ **Don't need to:**
- Edit any files
- Change any settings
- Configure anything
- The command does everything!

## Still Having Issues?

1. Make sure dev server is running (`npm run dev`)
2. Make sure you're on `http://localhost:3000/live`
3. Check simulation is actually running (terminal should show progress)
4. Try a hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
5. Check browser console (F12) for errors

That's it! The banner should "just work" when you run the simulator. 🎉



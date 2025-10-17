# Live Race Testing Options

You have **two ways** to test your live race features:

## Option 1: Static Snapshot 📸

**Use when**: Testing layouts, UI, and design

**Command**: `npm run mock-live 12` or use Admin Panel at `/admin/race-live`

**What it does**:

- Creates a snapshot of the race at a specific time (e.g., 12 hours in)
- All data is inserted at once
- No updates - just a static view

**Duration**: Instant (2-3 seconds)

**Best for**:

- ✅ UI/UX testing
- ✅ Layout testing
- ✅ Screenshot taking
- ✅ Quick visual checks

---

## Option 2: Live Simulation 🔴 LIVE

**Use when**: Testing real-time updates and live features

**Command**: `npm run simulate-live`

**What it does**:

- Starts from hour 0 (race start)
- Progressively inserts laps as they happen
- Simulates runners crossing timing mat in real-time
- Leaderboard updates every 5 seconds
- Runs at 60x speed (full race in 24 minutes)

**Duration**: 24 minutes at default speed (configurable)

**Best for**:

- ✅ Testing auto-refresh
- ✅ Testing live updates
- ✅ Watching leaderboard changes
- ✅ Testing performance
- ✅ Seeing progressive data growth
- ✅ Testing real-time charts

---

## Quick Comparison

| Feature          | Static Snapshot | Live Simulation |
| ---------------- | --------------- | --------------- |
| Speed            | Instant         | 24 min (at 60x) |
| Updates          | None            | Real-time       |
| Race progression | Fixed point     | Hour 0 → 24     |
| Best for         | UI testing      | Feature testing |
| Complexity       | Simple          | Advanced        |

---

## Examples

### Static Snapshot - Quick UI Check

```bash
# Create a snapshot at 12 hours
npm run mock-live 12

# View at http://localhost:3000/live
# See fixed data, test layouts, take screenshots
```

### Live Simulation - Full Experience

```bash
# In a new terminal (keep dev server running)
npm run simulate-live

# Watch at http://localhost:3000/live
# See runners completing laps in real-time
# Leaderboard updates as race progresses
```

### Live Simulation - Quick Test (First Hour Only)

```bash
# Simulate first hour at 600x speed (6 seconds total)
npm run simulate-live 600 1

# Perfect for quick feature verification
```

### Live Simulation - Detailed Watch (Slow Motion)

```bash
# Simulate first hour at 10x speed (6 minutes total)
npm run simulate-live 10 1

# See every lap update clearly
```

---

## Recommended Workflow

### Day 1: Design & UI

1. Use **Static Snapshot** (`npm run mock-live 12`)
2. Test layouts at different race stages
3. Fix UI issues
4. Take screenshots

### Day 2: Features & Integration

1. Use **Live Simulation** (`npm run simulate-live`)
2. Test auto-refresh behavior
3. Test watchlist updates
4. Test charts updating
5. Verify performance

### Before Launch

1. Run full **Live Simulation** (`npm run simulate-live 240`)
2. Complete 24-hour race in 6 minutes
3. Verify everything works end-to-end
4. Test mobile experience throughout simulation

---

## Which Should I Use?

### Use Static Snapshot if you want to:

- Quickly check how the page looks
- Test specific race moments (early, mid, late)
- Take screenshots
- Test responsive design
- Work on styling/layout

### Use Live Simulation if you want to:

- See data updating in real-time
- Test auto-refresh functionality
- Watch leaderboard changes
- Test performance with growing data
- Simulate actual race conditions
- Verify caching and updates

---

## Need Both?

You can use both! Common workflow:

1. **Morning**: Use static snapshots for UI work

   ```bash
   npm run mock-live 12
   ```

2. **Afternoon**: Run live simulation for feature testing

   ```bash
   npm run simulate-live 120 6  # 6 hours in 3 minutes
   ```

3. **Before commit**: Quick full race test
   ```bash
   npm run simulate-live 480  # 24 hours in 3 minutes
   ```

---

For detailed instructions:

- **Static Snapshot**: See `MOCK_LIVE_RACE_GUIDE.md`
- **Live Simulation**: See `LIVE_RACE_SIMULATOR_GUIDE.md`






# Simulation Race Time Integer Fix

## Problem

```
Error updating race config: {
  code: '22P02',
  message: 'invalid input syntax for type integer: "1312.79"'
}
```

## Root Cause

- Database column `current_race_time_sec` is type `INTEGER`
- Simulator was sending decimal values like `1312.79`
- PostgreSQL rejected the decimal value

## Fix

```typescript
// Before:
body: JSON.stringify({ currentRaceTimeSec: raceTimeSec });

// After:
body: JSON.stringify({ currentRaceTimeSec: Math.floor(raceTimeSec) });
```

## How to Apply

1. Stop the current simulation: Press `Ctrl+C` in the terminal
2. Restart: `npm run simulate-live 600 3`
3. Errors should be gone ✅

## Verification

Look for these logs WITHOUT errors:

```
✅ No "Error updating race config" messages
✅ PATCH /api/race/config 200 (not 500)
✅ Race time updates smoothly
```


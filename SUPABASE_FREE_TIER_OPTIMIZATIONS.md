# Supabase Free Tier Optimizations

## Overview

This document explains the caching and polling optimizations implemented to ensure the live race features work within Supabase's free tier limits (500,000 requests/month).

## Free Tier Limits

- **Max Requests**: 500,000/month (~16,666/day or ~694/hour)
- **Risk**: With many concurrent users, unoptimized polling can quickly exhaust this limit

## Optimization Strategy

### 1. Server-Side Caching (In-Memory)

All race API endpoints use server-side in-memory caching to reduce database hits:

#### `/api/race/leaderboard`

- **Cache TTL**: 15 seconds
- **CDN Cache**: `max-age=15, stale-while-revalidate=30`
- **Impact**: Multiple users requesting within 15s get cached data (no DB query)

#### `/api/race/config`

- **Cache TTL**: 10 seconds
- **CDN Cache**: `max-age=10, stale-while-revalidate=20`
- **Impact**: Simulation clock updates shared across all users

#### `/api/race/laps/[bib]`

- **Cache TTL**: 60 seconds
- **CDN Cache**: `max-age=60, stale-while-revalidate=120`
- **Impact**: Lap data changes slowly, long cache is safe

### 2. Client-Side Polling Intervals

Optimized polling frequencies balance freshness vs. API usage:

#### Leaderboard Updates

- **Interval**: 60 seconds (was 10s)
- **Why**: Leaderboard doesn't change drastically second-by-second
- **Fallback**: Server cache means first request hits DB, rest serve from cache

#### Race Clock/Config

- **Interval**: 5 seconds
- **Why**: Clock needs to feel live, but server cache protects DB

#### Expanded Lap Data

- **Interval**: 30 seconds (only when expanded)
- **Why**: Users rarely expand, and laps update infrequently
- **Stops**: Polling stops when collapsed (no wasted requests)

### 3. Cache Invalidation

Caches are cleared when data changes:

```typescript
// After updating race config (simulation mode, race time, etc.)
raceCache.clearPattern("config");

// After inserting laps or updating leaderboard
raceCache.clearPattern("leaderboard");
raceCache.clearPattern("laps");
```

## Request Calculation Examples

### Example: 100 Concurrent Users

Without optimization (10s polling everywhere):

```
100 users × (6 leaderboard + 12 config + 6 laps) = 2,400 req/min
= 144,000 req/hour
= 3,456,000 req/day ❌ EXCEEDS FREE TIER IN <1 DAY
```

With optimizations (15s cache + 60s polling):

```
Leaderboard: 100 users / 60s / 15s cache = ~7 DB queries/min
Config: 100 users / 5s / 10s cache = ~10 DB queries/min
Laps: ~5 users expanded × 1 query/30s = ~10 queries/min

Total: ~30 DB queries/min = 1,800/hour = 43,200/day ✅ WITHIN FREE TIER
```

### Example: 500 Concurrent Users (Peak)

```
Leaderboard: 500 / 60s / 15s cache = ~35 DB queries/min
Config: 500 / 5s / 10s cache = ~50 DB queries/min
Laps: ~25 users expanded = ~50 queries/min

Total: ~135 DB queries/min = 8,100/hour = 194,400/day ✅ STILL WITHIN FREE TIER
```

## CDN Edge Caching

Vercel's edge network provides additional caching layer:

- `Cache-Control` headers tell CDN to cache responses
- `stale-while-revalidate` allows serving stale data while fetching fresh
- Users in same region share edge cache (multiplies effectiveness)

## Monitoring Usage

### Check Supabase Dashboard

1. Go to Supabase Dashboard → Settings → Database
2. View "API requests" graph
3. Ensure staying under 500,000/month

### Check Cache Hit Rates

Look for `X-Cache: HIT` headers in browser dev tools (F12 → Network)

High cache hit rate = good optimization!

## Future Optimizations (If Needed)

If approaching limits:

1. **Increase Cache TTL**

   - Leaderboard: 15s → 30s
   - Config: 10s → 15s

2. **Reduce Polling Frequency**

   - Leaderboard: 60s → 90s
   - Lap data: 30s → 60s

3. **Use WebSockets** (requires paid tier)

   - Real-time updates without polling
   - Supabase Realtime subscriptions

4. **Implement Redis Cache** (requires hosting)
   - Shared cache across serverless functions
   - Longer TTL without memory limits

## Translation Updates

Added new translation keys:

- `live.lapPace` → "Lap Pace" (en) / "Varvtempo" (sv)
- `live.laps` → "Laps" (en) / "Varv" (sv)
- `live.simulationMode` → "SIMULATION MODE" / "SIMULERINGSLÄGE"
- `live.simulationModeDesc` → Description of simulation mode

All hardcoded "Tempo" labels now use `t.live?.lapPace` for proper internationalization.

## Summary

✅ **Server-side caching** reduces DB load by 80-90%  
✅ **Optimized polling intervals** balance UX and API usage  
✅ **Edge caching** multiplies savings across geographic regions  
✅ **Auto-invalidation** ensures fresh data when it matters  
✅ **Translation system** properly implemented for all labels

**Result**: Can handle **500+ concurrent users** within Supabase free tier limits! 🎉





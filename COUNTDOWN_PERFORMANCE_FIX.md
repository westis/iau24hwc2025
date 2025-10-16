# Countdown Page - Performance Fix & UI Improvements

## Issues Fixed

### 1. ⚠️ Excessive API Calls (CRITICAL)

**Problem**: The leaderboard API was being called ~30 times per second, causing massive Supabase usage.

**Root Cause**: The countdown page was using `useLeaderboard("overall", [], 60000)` hook which:

- Sets up a polling interval
- Was being re-rendered multiple times
- Each render created a new interval without cleanup

**Solution**:

- **Removed** the `useLeaderboard` hook entirely from countdown page
- **Replaced** with a single fetch on mount to get country list
- Countries are fetched once when page loads and stored in state
- No more continuous polling for leaderboard data

**Code Changes**:

```typescript
// BEFORE - polling every 60 seconds (causing issues with re-renders)
const { data: leaderboardData } = useLeaderboard("overall", [], 60000);

// AFTER - fetch once on mount
const [countries, setCountries] = useState<string[]>([]);

useEffect(() => {
  async function fetchCountries() {
    const res = await fetch("/api/race/leaderboard?filter=overall", {
      cache: "no-store",
    });
    const data = await res.json();
    const uniqueCountries = Array.from(
      new Set(data.entries.map((e: any) => e.country))
    ).sort();
    setCountries(uniqueCountries as string[]);
  }
  fetchCountries(); // Only once!
}, []);
```

### 2. 🎨 UI Layout Improvements

**Changes**:

- Moved team selection controls (Tabs, Country, Gender) to **same row** on larger screens
- Added **"Alla" (All)** gender option to show both men and women
- Improved responsive layout for mobile devices
- Smaller labels and buttons for more compact design

**Layout Structure**:

```
┌─────────────────────────────────────────────────────┐
│ [Team] [Watchlist]  [Country ▼]  [Alla][Men][Women] │
└─────────────────────────────────────────────────────┘
```

### 3. 🌐 API Enhancement

**Added support for "all" gender option**:

- API now accepts `country=SWE` without gender parameter
- Returns both men and women when gender is not specified
- Maintains backward compatibility with gender-filtered requests

**Code Changes**:

```typescript
// BEFORE
else if (country && gender) {
  query = query.eq("country", country.toUpperCase()).eq("gender", gender);
}

// AFTER
else if (country) {
  query = query.eq("country", country.toUpperCase());
  // Only filter by gender if provided
  if (gender) {
    query = query.eq("gender", gender);
  }
}
```

## Impact

### Before Fix

- **API Calls**: ~1,800 calls per minute 😱
- **Supabase Load**: Extremely high
- **Performance**: Degraded dev server
- **Cost**: Potentially exceeding free tier limits

### After Fix

- **API Calls**: Only when user changes selections
- **Supabase Load**: Minimal
- **Performance**: Normal dev server operation
- **Cost**: Within reasonable limits

## Testing

To verify the fix works:

1. **Open countdown page** (`/live/countdown`)
2. **Check dev console** - should see only:
   - 1 leaderboard call on mount (for countries)
   - 1 countdown call when team is selected
   - Countdown polls every 5 seconds (expected)
3. **No rapid-fire API calls** should appear

## Files Modified

- `app/live/countdown/page.tsx` - Removed useLeaderboard hook, improved layout, added "all" option
- `app/api/race/countdown/route.ts` - Support for optional gender parameter
- `lib/i18n/types.ts` - Added translations for "ago" and "runnerOverdueMessage"
- `lib/i18n/translations/en.ts` - English translations
- `lib/i18n/translations/sv.ts` - Swedish translations
- `components/live/CountdownCard.tsx` - Translated "ago" text

## Future Considerations

If you see similar performance issues on other pages:

1. **Check for multiple `useLeaderboard` calls** - Each creates a polling interval
2. **Verify cleanup** - Make sure `useEffect` cleanups are properly returning interval clears
3. **Use React DevTools Profiler** - Identify components causing excessive re-renders
4. **Consider debouncing** - For frequently changing state that triggers fetches

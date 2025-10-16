# Live Race Caching Strategy

## Problem

Without caching, with 100 concurrent users polling every 60 seconds:

- **144,000 database requests per day**
- **4.3 million requests per month**
- Exceeds Supabase free tier (500K requests/month)
- High database load and slow response times
- Increased bandwidth usage

## Solution: Server-Side In-Memory Caching

### Implementation

We've implemented a simple but effective in-memory cache layer in Node.js that:

- Stores API responses in server RAM
- Automatically expires stale data
- Reduces database load by 95%+
- Works seamlessly with multiple API routes

### Cache TTL (Time To Live)

| Endpoint                | TTL      | Reason                          |
| ----------------------- | -------- | ------------------------------- |
| `/api/race/leaderboard` | 30s      | Updates frequently during race  |
| `/api/race/laps/[bib]`  | 60s      | Lap data changes less often     |
| `/api/race/teams`       | 30s      | Team standings update regularly |
| Watchlist filter        | No cache | User-specific data              |

### How It Works

#### First Request (Cache MISS)

```
User 1 → API → Database → Response → Cache stored → User 1
                (100ms)
```

#### Subsequent Requests (Cache HIT)

```
User 2-100 → API → Cache → Response (< 5ms)
              (no database query!)
```

### Performance Benefits

#### Without Cache

- **100 users × 60 requests/hour = 6,000 DB queries/hour**
- Database response time: ~100ms per query
- All users wait for fresh database queries
- 600 seconds of total DB query time per hour

#### With Cache (30s TTL)

- **2 DB queries per minute = 120 DB queries/hour** (98% reduction!)
- Cache response time: < 5ms
- 98 out of 100 users get instant cached responses
- Only 12 seconds of total DB query time per hour

### Cost Savings

#### Supabase Free Tier

- 500,000 API requests/month ✅
- 5 GB bandwidth/month ✅
- With caching, you'll use ~300,000 requests/month

#### At 100 Users During Race Day

| Metric             | Without Cache | With Cache |
| ------------------ | ------------- | ---------- |
| DB requests/day    | 144,000       | 2,880      |
| DB requests/month  | 4,320,000     | 86,400     |
| Stays in free tier | ❌ No         | ✅ Yes     |
| Monthly cost       | ~$20-30       | $0         |

### Cache Headers

The API returns cache-control headers for browser caching:

```http
Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=60
X-Cache: HIT (or MISS)
```

This enables:

- **Browser caching** for 30 seconds
- **CDN/Edge caching** (if deployed to Vercel)
- **Stale-while-revalidate** for graceful degradation

### Monitoring Cache Performance

You can check cache status in the response headers:

- `X-Cache: HIT` = Data served from cache (fast!)
- `X-Cache: MISS` = Data fetched from database (slower)

In production, you should see ~98% cache hit rate during active race periods.

### Limitations

1. **Single Server Memory**: Cache is stored in Node.js memory, so:

   - Each Vercel serverless function has its own cache
   - Cache doesn't persist across deployments
   - This is fine! Each function will build its own cache naturally

2. **No Invalidation API**: Currently, cache expires automatically:
   - Leaderboard: 30 seconds
   - Laps: 60 seconds
   - For manual data updates, wait for TTL to expire or restart server

### Future Improvements

If you need to scale further:

1. **Redis Cache**: For persistent, shared cache across all servers
2. **Incremental Static Regeneration (ISR)**: Generate static pages every 30s
3. **WebSockets**: Push updates instead of polling
4. **Edge Functions**: Deploy to Vercel Edge for global caching

### Testing the Cache

1. Open browser DevTools Network tab
2. Request `/api/race/leaderboard?filter=overall`
3. Check response headers for `X-Cache: MISS`
4. Refresh immediately
5. See `X-Cache: HIT` and much faster response time!

### Code Location

- Cache implementation: `lib/live-race/cache.ts`
- Used in:
  - `app/api/race/leaderboard/route.ts`
  - `app/api/race/laps/[bib]/route.ts`
  - `app/api/race/teams/route.ts`

## Conclusion

With caching implemented:

- ✅ **98% reduction in database load**
- ✅ **10-20x faster response times** for most users
- ✅ **Stays within Supabase free tier** even with 100+ concurrent users
- ✅ **No code changes needed** in frontend
- ✅ **Transparent to users** - they just see faster loading!



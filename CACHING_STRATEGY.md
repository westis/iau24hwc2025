# Caching & Revalidation Strategy

## Overview

This application uses **Incremental Static Regeneration (ISR)** combined with **On-Demand Revalidation** to provide both speed and fresh content.

## How It Works

### 1. ISR - Background Revalidation (Normal Traffic)

All API routes have a `revalidate` time that controls automatic background updates:

```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

**Timeline Example:**

- **12:00 PM**: User A visits → Fresh data from Supabase, cached for 60s ⚡
- **12:30 PM**: User B visits → Gets cached data instantly (no DB query) ⚡⚡⚡
- **12:01 PM** (61s later): User C visits → Gets cached data instantly + triggers background refresh
- **12:02 PM**: User D visits → Gets the newly refreshed data ⚡

**Cache Times:**

- `/api/runners`: 60 seconds
- `/api/runners/[id]`: 60 seconds
- `/api/news`: 120 seconds (2 min)
- `/api/race`: 300 seconds (5 min)

### 2. On-Demand Revalidation (Admin Updates)

When you update content in the admin panel, the cache is **immediately cleared** using `revalidatePath()`:

```typescript
// Example from runner update
revalidatePath("/participants");
revalidatePath(`/runners/${id}`);
revalidatePath("/api/runners");
revalidatePath(`/api/runners/${id}`);
```

**This means:**

- ✅ Admin updates are visible **immediately** to all users
- ✅ No waiting for the 60s cache to expire
- ✅ Next visitor gets fresh data from Supabase

## When Cache is Cleared

### Runner Updates

**Endpoints:** `/api/runners/[id]` (PATCH), `/api/runners/[id]/match` (POST)

Clears:

- `/participants`
- `/runners/[id]`
- `/api/runners`
- `/api/runners/[id]`

### News Updates

**Endpoints:** `/api/news` (POST), `/api/news/[id]` (PUT, DELETE)

Clears:

- `/news`
- `/news/[id]`
- `/api/news`
- `/api/news/[id]`

### Race Updates

**Endpoint:** `/api/race/[id]` (PUT)

Currently handled client-side via `/api/revalidate` call in admin component.

Clears:

- `/`
- `/loppet`
- `/participants`

### Runner Notes

**Endpoints:** `/api/runner-notes/[id]` (PUT, DELETE), `/api/runners/[id]/notes` (POST)

Clears:

- `/participants`
- `/runners/[id]`
- `/api/runners`

## Deployment Updates (GitHub Push)

When you deploy via GitHub:

- **Vercel automatically rebuilds** all pages
- **All caches are cleared**
- **First visitor** after deployment gets fresh data from Supabase
- **Subsequent visitors** get fast cached responses

## Best Practices

### ✅ DO

- Keep ISR revalidation times reasonable (60-300s)
- Use `revalidatePath()` after any data mutation
- Clear all related paths (pages + API routes)

### ❌ DON'T

- Set revalidation too low (<30s) - wastes resources
- Set revalidation too high (>10min) - stale data
- Forget to add revalidation to new mutation endpoints

## Cache-Control Headers

API responses also include HTTP cache headers for CDN/browser caching:

```typescript
'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
```

This means:

- **CDN caches for 60s**
- **Can serve stale content for 120s** while regenerating in background
- **Users get instant responses** even during regeneration

## Summary

| Scenario            | What Happens                           | Speed          |
| ------------------- | -------------------------------------- | -------------- |
| Normal traffic      | Served from cache                      | ⚡⚡⚡ Instant |
| After cache expires | Background refresh, still serve cached | ⚡⚡⚡ Instant |
| Admin update        | Immediate cache clear, fetch from DB   | ⚡ ~200ms      |
| After admin update  | Fresh cached data                      | ⚡⚡⚡ Instant |
| GitHub deployment   | Full rebuild, all caches cleared       | ⚡ Fresh start |

**Result:** Users always get fast responses + admins see updates immediately! 🎉

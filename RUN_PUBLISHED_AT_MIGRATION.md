# Add Published At Field to News

This migration adds a `published_at` column to the news table to allow custom publish times for articles.

## What it does

1. Adds `published_at TIMESTAMP` column to the news table
2. Sets `published_at` to `created_at` for existing published articles
3. Updates the sorting to use `published_at` (or `created_at` if null)

## How to run

### Using psql (direct connection):

```bash
psql postgresql://[username]:[password]@[host]/[database] < migrations/027_add_published_at.sql
```

### Using Node.js script:

```bash
tsx migrations/027_add_published_at.ts
```

### Using Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Paste the contents of `migrations/027_add_published_at.sql`
5. Click "Run"

## Features

### Admin Panel

- New "Publish Date & Time" field in news editor
- Defaults to current time when creating new articles
- Can be edited at any time
- Controls the sort order (most recent first)

### Sorting Behavior

- Published articles sorted by `published_at` (falls back to `created_at` if null)
- Allows you to publish old drafts with a recent date so they appear at the top
- All existing published articles will maintain their current sort order (using `created_at`)

## Rollback

If you need to rollback:

```sql
ALTER TABLE news DROP COLUMN IF EXISTS published_at;
```

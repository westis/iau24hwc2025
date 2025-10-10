# Vercel Blob Storage Setup

This app uses **Vercel Blob Storage** to persist runner data across all users. This allows "Fetch PBs" to update data for everyone.

## Why Vercel Blob?

- ❌ Vercel's filesystem is **read-only and ephemeral** - can't write to JSON files
- ❌ SQLite database is **ephemeral** - changes are lost when serverless function ends
- ✅ Vercel Blob is **persistent** - data persists across deployments and all users see the same data

## Setup Instructions

### 1. Create a Blob Store in Vercel Dashboard

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Storage** tab
3. Click **Create Database** → **Blob**
4. Name it `iau24hwc-runners` (or any name you prefer)
5. Click **Create**

### 2. Connect to Your Project

Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` environment variable to your project.

You can verify it's set:
- Go to **Settings** → **Environment Variables**
- Look for `BLOB_READ_WRITE_TOKEN`

### 3. Deploy

Deploy your app (or it may auto-deploy when you connected the blob store):

```bash
git push origin main
```

### 4. How It Works

**Initial Load (New Visitors):**
1. App tries to load from Vercel Blob via `/api/blob/runners`
2. If blob is empty, falls back to `seed.json` from the repo
3. Data cached in browser localStorage for speed

**Fetching PBs (Admin):**
1. Admin clicks "Fetch PBs" on `/match` page
2. API fetches from DUV and enriches runner data
3. Saves ALL runners to Vercel Blob
4. All users see updated data on next page load

**Data Flow:**
```
┌─────────────┐
│ Vercel Blob │ ← Single source of truth for all users
└──────┬──────┘
       │
       ├─→ GET /api/blob/runners (load data)
       │
       └─→ POST /api/fetch-performances-blob (update data)
```

## Testing Locally

The app works without Vercel Blob in local development:

```bash
npm run dev
```

- Blob endpoints will fall back to `seed.json`
- "Fetch PBs" will still work but data won't persist across users
- Set `BLOB_READ_WRITE_TOKEN` in `.env.local` to test blob integration locally

## Troubleshooting

**"Fetch PBs" not persisting:**
- Check that `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
- Check browser console for blob upload errors
- Check Vercel function logs for API errors

**Blob storage full:**
- Current usage: ~1MB for 400 runners
- Vercel Blob free tier: 1GB
- You can monitor usage in Vercel Dashboard → Storage

**Need to reset data:**
- Currently no admin UI to reset
- Delete and recreate the blob store in Vercel Dashboard
- Or manually clear via Vercel Blob CLI

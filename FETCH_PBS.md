# Fetch PBs - Simple Local Approach

This script fetches Personal Bests from DUV and updates the seed data JSON file locally. Once committed and pushed, Vercel auto-deploys and **all users see the updated PBs**.

## Why This Approach?

- ✅ **Simple**: No database setup, no Vercel Blob issues
- ✅ **Reliable**: Git is the source of truth
- ✅ **Universal**: All users get the same data from seed JSON
- ✅ **Version controlled**: Track PB updates in git history

## Usage

### Fetch PBs for ALL matched runners (397 runners):

```bash
npm run fetch-pbs
```

### Fetch PBs only for runners WITHOUT PBs:

```bash
npm run fetch-pbs:missing
```

### Fetch PBs only for manually-matched runners:

```bash
npm run fetch-pbs:manual
```

## What It Does

1. Loads `data/seed-data.json`
2. Filters runners based on your choice (all/missing/manual)
3. For each runner:
   - Fetches their DUV profile
   - Extracts 24h PBs from `AllPBs` array
   - Calculates all-time PB and last-3-years PB
   - Updates the runner in seed data
4. Increments version number
5. Saves updated `seed-data.json`
6. Shows you git commands to commit and push

## Example Output

```
Loading seed data from: data/seed-data.json

Found 397 runners in seed data
Found 397 runners with DUV IDs

Filter: all - fetching 397 runners

Starting PB fetch...

[1/397] John DOE (DUV: 12345)
  ✓ All-time: 245.678 (2019) | Last 3Y: 234.567 (2023)

[2/397] Jane SMITH (DUV: 67890)
  ✓ All-time: 256.789 (2021) | Last 3Y: 256.789 (2023)

...

============================================================
Fetch complete: 397 successful, 0 errors
============================================================

✓ Saved to data/seed-data.json
✓ Version bumped to 6

Next steps:
  1. git add data/seed-data.json
  2. git commit -m "Update PBs from DUV (397 runners)"
  3. git push origin main

Vercel will auto-deploy and all users will see the updated PBs!
```

## Rate Limiting

The script waits 100ms between each DUV API request to avoid rate limiting. Fetching 397 runners takes about 40-50 seconds.

## Deployment Workflow

1. **Run locally:** `npm run fetch-pbs`
2. **Review changes:** Check `data/seed-data.json` diff
3. **Commit:** `git add data/seed-data.json && git commit -m "Update PBs from DUV"`
4. **Push:** `git push origin main`
5. **Auto-deploy:** Vercel deploys in ~2 minutes
6. **Done:** All users see updated PBs on next page load

## Troubleshooting

**Script fails with "Cannot find module":**
```bash
npm install
```

**DUV API errors:**
- The script continues on errors - successful fetches are still saved
- Check if DUV website is accessible: https://statistik.d-u-v.org

**No changes saved:**
- Make sure runners have `duv_id` in seed-data.json
- Check console output for error messages

## Technical Details

- Uses DUV `/api/runner/{id}` endpoint
- Extracts from `AllPBs[]['24h']` array (more reliable than calculating from results)
- Updates both all-time and last-3-years PBs
- Last 3 years = since October 18, 2022 (3 years before race)
- Saves to `data/seed-data.json` with incremented version

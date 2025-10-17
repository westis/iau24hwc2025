# BreizhChrono Integration - Quick Start

## 🚀 Pre-Race Setup (Do Once)

### 1. Run Database Migrations

In Supabase SQL Editor:

```sql
-- Run these two files in order:
migrations/030_add_bib_number.sql
migrations/031_add_lap_tracking.sql
```

### 2. Configure Environment Variables

Add to Vercel environment variables:

```env
BREIZH_CHRONO_URL=https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14
FIRST_LAP_DISTANCE=0.1
LAP_DISTANCE=1.5
STALE_DATA_THRESHOLD_MINUTES=5
CRON_SECRET=your_random_secret
```

### 3. Assign Bib Numbers

1. Go to: `/admin/bib-numbers`
2. Enter bib number for each runner
3. Check for duplicates (system will warn you)
4. Click "Save All"

### 4. Test Connection

```bash
npm run test-scraper
```

Expected before race: "Race results not yet available" ✅
Expected during race: "Found X runners in leaderboard" ✅

## 🏁 Race Day (Quick Steps)

### When Race Starts

1. Go to `/admin/race-live`
2. Click "Race Control" tab
3. Set state to **"Live"**
4. Done! Data fetches automatically every 60 seconds

### Monitor During Race

- **Live page:** `/live` - Shows leaderboard with auto-refresh
- **Staleness:** Automatic warning if no update in 5+ minutes
- **Admin dashboard:** `/admin/race-live` for manual controls

## 🔍 Quick Troubleshooting

| Issue              | Solution                    |
| ------------------ | --------------------------- |
| No data appearing  | Check race state is "Live"  |
| Stale data warning | Check Vercel cron logs      |
| Wrong lap numbers  | Verify LAP_DISTANCE=1.5     |
| Duplicate bibs     | Fix in `/admin/bib-numbers` |

## 📞 Emergency Commands

### Manual Data Fetch

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/fetch-race-data
```

### Check Data Freshness

```
GET /api/race/staleness
```

## ✅ Success Indicators

- [ ] Leaderboard updates every ~60 seconds
- [ ] Lap numbers increment correctly
- [ ] No stale data warnings
- [ ] Runner positions change naturally
- [ ] Distance increases steadily

## 📖 Full Documentation

- **Complete Setup:** `BREIZH_CHRONO_SETUP.md`
- **Implementation Details:** `BREIZH_CHRONO_IMPLEMENTATION.md`

---

**Need Help?** Check the full setup guide or implementation summary for detailed troubleshooting.




# CLI Tools for Backend Data Management

## Overview

All data management is done via **backend CLI tools**. The web frontend is **read-only** for public viewing.

## Architecture

```
PDF Entry List → CLI Parser → SQLite → CLI Matcher → CLI Performance Fetcher → Public Web View
```

## Prerequisites

**Python Dependencies:**
```bash
pip install docling requests
```

**Node.js Dependencies:**
```bash
npm install
```

## Workflow

### Step 1: Parse PDF Entry List

Parse the official IAU entry list PDF and save runners to database.

```bash
python scripts/parse-pdf-backend.py <path-to-entry-list.pdf>
```

**Options:**
- `--db-path data/iau24hwc.db` - Custom database path (default: `data/iau24hwc.db`)
- `--json` - Also output JSON to stdout

**Example:**
```bash
python scripts/parse-pdf-backend.py downloads/iau-2025-entry-list.pdf

# Output:
# Parsing PDF: downloads/iau-2025-entry-list.pdf
# Saving 150 runners to database: data/iau24hwc.db
# ✓ Successfully saved 150 runners to database
#
# ============================================================
# SUMMARY:
#   Total runners: 150
#   Men: 95
#   Women: 55
#   Countries: 28
# ============================================================
```

**What it does:**
- Extracts: entry ID, firstname, lastname, nationality (ISO 3166-1 alpha-3), gender
- Normalizes names (titlecase), nationalities (USA, GBR, DEU, etc.), gender (M/W)
- Removes duplicates
- Saves to `runners` table with `match_status='unmatched'`

---

### Step 2: Match Runners to DUV Profiles

Auto-match runners to their DUV profiles using fuzzy matching.

```bash
python scripts/match-runners.py
```

**Options:**
- `--db-path data/iau24hwc.db` - Database path
- `--threshold 0.8` - Auto-match confidence threshold (0.0-1.0, default: 0.8)

**Example:**
```bash
python scripts/match-runners.py

# Output:
# Matching 150 runners...
#
# [1/150] John Smith (USA, M)
#   → Found 5 candidates, best confidence: 0.95
#   ✓ AUTO-MATCHED to DUV ID 12345 (John Smith)
#
# [2/150] Marie Dupont (FRA, W)
#   → Found 3 candidates, best confidence: 0.72
#   ⚠ Manual review needed (best: 0.72)
#
# ...
#
# ============================================================
# MATCHING SUMMARY:
#   Auto-matched: 112
#   Manual review: 32
#   No match: 6
#   Total: 150
# ============================================================
```

**What it does:**
- Searches DUV API for each unmatched runner
- Calculates confidence score (0.0-1.0):
  - Exact lastname: +0.4
  - Exact firstname: +0.3
  - Nation match: +0.2
  - Gender match: +0.1
- Auto-matches if confidence ≥ 0.8
- Saves all candidates to `match_candidates` table for manual review
- Rate-limited to 1 request/second

---

### Step 3: Fetch Performance Data from DUV

Fetch 24h race history and calculate personal bests.

```bash
python scripts/fetch-performances.py
```

**Options:**
- `--db-path data/iau24hwc.db` - Database path

**Example:**
```bash
python scripts/fetch-performances.py

# Output:
# Fetching performance data for 112 runners...
#
# [1/112] John Smith (DUV ID: 12345)
#   → Found 15 24h race results
#   ✓ PB All-Time: 265.50 km, Last 2Y: 258.30 km
#
# [2/112] Marie Dupont (DUV ID: 67890)
#   → Found 8 24h race results
#   ✓ PB All-Time: 242.10 km, Last 2Y: 240.50 km
#
# ...
#
# ============================================================
# PERFORMANCE DATA FETCHED SUCCESSFULLY
#   Total runners processed: 112
# ============================================================
```

**What it does:**
- Fetches DUV profile for each matched runner
- Extracts 24h race results only
- Calculates:
  - All-time personal best (highest distance ever)
  - Last 2 years personal best (highest distance in last 730 days)
- Saves performance history to `performances` table
- Updates runner with PBs, age, date of birth
- Rate-limited to 1 request/second

---

## Manual Review (Optional)

If some runners need manual review (confidence < 0.8), you can inspect candidates:

```bash
sqlite3 data/iau24hwc.db

# Find runners needing manual review
SELECT r.firstname, r.lastname, r.nationality, r.gender
FROM runners r
WHERE r.match_status = 'unmatched'
AND EXISTS (SELECT 1 FROM match_candidates mc WHERE mc.runner_id = r.id);

# See candidates for a specific runner
SELECT mc.duv_person_id, mc.firstname, mc.lastname, mc.year_of_birth,
       mc.nation, mc.personal_best, mc.confidence
FROM match_candidates mc
JOIN runners r ON r.id = mc.runner_id
WHERE r.entry_id = '42'
ORDER BY mc.confidence DESC;

# Manually match a runner
UPDATE runners
SET duv_id = 12345, match_status = 'manually-matched'
WHERE entry_id = '42';
```

Then re-run Step 3 to fetch performance data for manually matched runners.

---

## Database Inspection

```bash
# Count runners by match status
sqlite3 data/iau24hwc.db "SELECT match_status, COUNT(*) FROM runners GROUP BY match_status;"

# Show top 10 PBs (all-time)
sqlite3 data/iau24hwc.db "SELECT firstname, lastname, nationality, personal_best_all_time FROM runners WHERE personal_best_all_time IS NOT NULL ORDER BY personal_best_all_time DESC LIMIT 10;"

# Count teams
sqlite3 data/iau24hwc.db "SELECT nationality, gender, COUNT(*) as runner_count FROM runners GROUP BY nationality, gender ORDER BY nationality;"

# View performance history for a runner
sqlite3 data/iau24hwc.db "SELECT p.event_name, p.event_date, p.distance, p.rank FROM performances p JOIN runners r ON r.id = p.runner_id WHERE r.entry_id = '1' ORDER BY p.event_date DESC;"
```

---

## Viewing Data (Public Frontend)

Once data is populated, start the web server:

```bash
npm run dev
```

Navigate to:
- **http://localhost:3000** - Homepage
- **http://localhost:3000/runners** - Individual runners list
- **http://localhost:3000/teams** - Team predictions (last 2 years PB)

The frontend is **read-only** - all data management happens via CLI tools.

---

## Complete Example Workflow

```bash
# 1. Parse PDF
python scripts/parse-pdf-backend.py iau-2025-entry-list.pdf

# 2. Match runners to DUV
python scripts/match-runners.py

# 3. Fetch performance data
python scripts/fetch-performances.py

# 4. Start web server
npm run dev

# 5. Open browser to http://localhost:3000
```

---

## Troubleshooting

**"Database not found"**
- Run `parse-pdf-backend.py` first to create the database

**"No unmatched runners found"**
- All runners already matched, or database is empty

**"ERROR searching DUV: Connection timeout"**
- DUV API may be slow or unavailable
- Script will continue and mark as "no match"

**"Failed to fetch profile"**
- DUV API error or runner ID invalid
- Check manually: https://statistik.d-u-v.org/runner/{duv_id}

**Rate limiting**
- All scripts respect 1 request/second limit
- For 150 runners, matching takes ~2.5 minutes

---

## Production Deployment

For production:

1. Run CLI tools on server to populate database
2. Deploy Next.js app with read-only database access
3. Set up cron jobs for periodic data updates (optional)
4. Use PostgreSQL instead of SQLite for scalability (optional)

Example cron for daily updates:
```bash
0 3 * * * cd /path/to/app && python scripts/fetch-performances.py
```

---

## Data Files

- **Database:** `data/iau24hwc.db` (SQLite, gitignored)
- **Schema:** `lib/db/schema.sql`
- **Scripts:** `scripts/*.py`

---

## API Endpoints (Read-Only)

The frontend uses these API endpoints:

- `GET /api/runners` - All runners
- `GET /api/teams?metric=last-2-years&gender=M` - Team rankings

No write endpoints are exposed to the public frontend.

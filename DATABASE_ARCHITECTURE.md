# Database Architecture

## Overview

The IAU 24h World Championships Runner Analytics app now uses **SQLite** for persistent data storage instead of browser localStorage.

## Architecture

```
PDF Upload → Python Parser → SQLite Database → Next.js API → React Frontend
```

### Data Flow

1. **PDF Parsing (Backend)**
   - User uploads PDF via `/upload` page
   - API route `/api/parse-pdf-db` receives file
   - Spawns Python script `scripts/parse-pdf-backend.py`
   - Python parses PDF and saves directly to SQLite
   - Returns runners from database

2. **Runner Matching**
   - API route `/api/match-runner-db` performs auto-matching
   - Saves match candidates to `match_candidates` table
   - Updates runner with DUV ID and match status

3. **Performance Data**
   - API route `/api/fetch-performances-db` fetches DUV profiles
   - Calculates PBs (all-time, last 2 years)
   - Saves performance history to `performances` table

4. **Team Rankings**
   - API route `/api/teams` calculates team rankings
   - Groups runners by nationality + gender
   - Saves to `teams` table (materialized view)

## Database Schema

### Tables

**runners**
- Primary runner data from entry list
- DUV matching information
- Performance metrics (PBs, age, DOB)

**performances**
- Individual race results from DUV
- Linked to runners via `runner_id`

**match_candidates**
- DUV search results for manual review
- Confidence scores for each candidate

**teams**
- Calculated team rankings (materialized view)
- Denormalized top 3 runners for performance

## API Routes

### Database-Backed Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/parse-pdf-db` | POST | Upload PDF → parse → save to DB |
| `/api/runners` | GET | Get all runners from DB |
| `/api/match-runner-db` | POST | Auto-match runner + save to DB |
| `/api/fetch-performances-db` | POST | Fetch DUV data + save to DB |
| `/api/teams` | GET | Get team rankings (query params: metric, gender) |

### Legacy Routes (localStorage-based)

These routes are kept for compatibility but should be replaced:
- `/api/parse-pdf` - Old in-memory parser
- `/api/match-runner` - Old non-persistent matching
- `/api/fetch-performances` - Old non-persistent performance fetch

## Backend Parser Script

**Location:** `scripts/parse-pdf-backend.py`

**Usage:**
```bash
python scripts/parse-pdf-backend.py <pdf_file> [--db-path data/iau24hwc.db]
```

**Features:**
- Uses Dockling for PDF parsing
- Direct SQLite writes (no JSON intermediary)
- Handles table extraction and text fallback
- Nationality normalization (ISO 3166-1 alpha-3)
- Gender normalization (M/W)
- Duplicate removal

**Dependencies:**
```bash
pip install docling
```

## Database Location

**Development:** `data/iau24hwc.db` (gitignored)

**Schema:** `lib/db/schema.sql`

**Utilities:** `lib/db/database.ts`

## Frontend Updates Needed

The frontend pages still use localStorage. They need to be updated to:

1. **Upload Page** (`app/upload/page.tsx`)
   - Change API endpoint to `/api/parse-pdf-db`
   - Remove localStorage writes
   - Fetch from `/api/runners` instead

2. **Matching Page** (`app/matching/page.tsx`)
   - Load runners from `/api/runners` on mount
   - Use `/api/match-runner-db` for matching
   - Update state from API responses

3. **Rankings Page** (`app/rankings/page.tsx`)
   - Load teams from `/api/teams?metric=X&gender=Y`
   - Remove localStorage dependencies

## Migration Steps

To migrate from localStorage to database:

1. Upload a PDF entry list via `/upload`
2. It will automatically save to SQLite
3. Previous localStorage data is ignored
4. All new operations use database

## Database Utilities

**Initialize:**
```typescript
import { initDatabase } from '@/lib/db/database'
initDatabase() // Creates tables if not exist
```

**CRUD Operations:**
```typescript
import {
  insertRunner,
  updateRunner,
  getRunners,
  getRunnerByEntryId
} from '@/lib/db/database'

// Insert
insertRunner(runner)

// Update
updateRunner(entryId, { duvId: 12345, matchStatus: 'auto-matched' })

// Query
const runners = getRunners()
const runner = getRunnerByEntryId('123')
```

**Team Rankings:**
```typescript
import { calculateAndSaveTeams, getTeams } from '@/lib/db/database'

// Calculate and save
calculateAndSaveTeams('all-time')

// Retrieve
const teams = getTeams('all-time', 'M')
```

## Testing

**Test Backend Parser:**
```bash
# Create sample PDF or use test file
python scripts/parse-pdf-backend.py test-entry-list.pdf

# Check database
sqlite3 data/iau24hwc.db "SELECT COUNT(*) FROM runners;"
```

**Test API Routes:**
```bash
# Get runners
curl http://localhost:3000/api/runners

# Get teams
curl http://localhost:3000/api/teams?metric=all-time&gender=M
```

## Benefits of SQLite Approach

✅ **Persistent Storage** - Data survives page refresh
✅ **Multi-User Ready** - Server-side storage
✅ **Queryable** - SQL for complex queries
✅ **Backup-Friendly** - Single file database
✅ **Type-Safe** - TypeScript ORM layer
✅ **Production-Ready** - Can swap to PostgreSQL easily

## Next Steps

1. Update frontend to use database APIs
2. Remove localStorage dependencies
3. Add database backup script
4. Implement data export (JSON/CSV)
5. Add admin UI for database management

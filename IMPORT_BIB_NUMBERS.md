# Import Bib Numbers - Quick Guide

## ✅ CSV Files Ready

- Women: `24H_Worlds_Women_Entry_List__Parsed_.csv` (171 runners)
- Men: `24H_Worlds_Men_Entry_List__Parsed_.csv` (224 runners)
- **Total: 395 runners**

## 📋 Steps to Import

### 1. Run Database Migration

First, add the `bib` column to the runners table in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this migration:

```sql
-- Migration 030: Add bib number to runners table
ALTER TABLE runners ADD COLUMN IF NOT EXISTS bib INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_runners_bib ON runners(bib) WHERE bib IS NOT NULL;
COMMENT ON COLUMN runners.bib IS 'Race bib number for live timing identification';
```

Or copy the contents of: `migrations/030_add_bib_number.sql`

### 2. Run Import Script

After the migration is complete:

```bash
npm run import-bibs
```

### What the Script Does

1. **Loads CSV files** from project root
2. **Loads all runners** from your database
3. **Matches runners** by lastname and nationality code
4. **Shows matches** for your review
5. **Waits 5 seconds** for you to cancel if needed (Ctrl+C)
6. **Updates database** with bib numbers

### Expected Output

```
🔢 Importing bib numbers from CSV files...

📋 Loaded 171 women from CSV
📋 Loaded 224 men from CSV

📊 Total runners in CSV: 395

🔍 Loading runners from database...
   Found 397 runners in database

🔗 Matching runners...

✅ #240 → Firstname Azzouz (ALG)
✅ #241 → Firstname Younsi (ALG)
...

📊 Match Summary:
   Matched: 395/395
   Unmatched: 0

🔄 Ready to update 395 runners in database.
   Press Ctrl+C to cancel, or wait 5 seconds to proceed...

💾 Updating database...

✅ Done!
   Successfully updated: 395
   Errors: 0

🎉 Bib numbers have been imported!
```

## 🔍 Matching Logic

The script matches runners by:

1. **Exact match**: Same lastname (normalized) + same nationality code
2. **Partial match**: Similar lastname + same nationality code

Normalization removes:

- Diacritics (é → e, ñ → n, etc.)
- Special characters
- Case differences

## ⚠️ If Matches Fail

If some runners don't match automatically:

1. Check the "Unmatched" list in the output
2. Manually assign via `/admin/bib-numbers` interface
3. Or fix the lastname in your database to match the CSV

## 🎯 After Import

1. Visit `/admin/bib-numbers` to verify
2. All runners should have their bib numbers assigned
3. Ready for live timing integration!

## 📝 CSV Format

The CSV files should have this format:

```csv
bib,code,country,name,category
240,ALG,Algeria,Azzouz,
241,ALG,Algeria,Younsi,
...
```

- **bib**: Race bib number (1-410)
- **code**: 3-letter nationality code (ALG, USA, etc.)
- **country**: Full country name (not used for matching)
- **name**: Lastname only
- **category**: Age category (W35, M45, etc.) - optional

## 🛠️ Troubleshooting

### "column runners.bib does not exist"

→ Run the migration first (step 1 above)

### "Missing Supabase credentials"

→ Make sure `.env.local` exists with:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Many unmatched runners

→ Check that nationality codes match between CSV and database
→ Check that lastnames are similar (script handles minor differences)

---

**Ready?** Run the migration, then execute `npm run import-bibs`!




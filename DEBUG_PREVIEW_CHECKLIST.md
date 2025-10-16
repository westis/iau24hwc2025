# Preview Article Not Showing - Debug Checklist

## Things to Check:

### 1. Database Migration

✅ **Did you run the SQL migration?**

Go to Supabase → SQL Editor and run:

```sql
ALTER TABLE news
ADD COLUMN IF NOT EXISTS is_preview_men BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_preview_women BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preview_url TEXT;
```

**Verify it worked:**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'news'
AND column_name IN ('is_preview_men', 'is_preview_women', 'preview_url');
```

Should return 3 rows.

---

### 2. Article Settings

Check your preview article has ALL of these:

✅ **Published**: Must be checked  
✅ **Women's Race Preview**: Must be checked  
✅ **Preview Article URL**: Must be filled in (e.g., `https://ultramarathon.se/...`)

**Verify in database:**

```sql
SELECT id, title, published, is_preview_women, preview_url
FROM news
WHERE is_preview_women = TRUE;
```

---

### 3. Check API Response

Open browser console on participants page and run:

```javascript
fetch("/api/news/previews")
  .then((r) => r.json())
  .then(console.log);
```

Should return something like:

```json
{
  "men": { "title": "...", "preview_url": "..." },
  "women": { "title": "...", "preview_url": "..." }
}
```

If `women` is `null` or missing `preview_url`, that's the problem.

---

### 4. Vercel Deployment

✅ **Check that Vercel deployed successfully**

Go to: https://vercel.com/[your-account]/[your-project]/deployments

Latest deployment should be green (✅ Ready)

---

### 5. Gender Selection

✅ **Make sure you're viewing "Women" tab**

On participants page:

- Click "Individual" tab (not Teams or Media)
- Click "Women" button at top
- Banner should appear below the gender selector

---

## Quick Fix Commands

### If columns don't exist, run migration:

```sql
-- In Supabase SQL Editor
ALTER TABLE news
ADD COLUMN IF NOT EXISTS is_preview_men BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_preview_women BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preview_url TEXT;
```

### If article exists but isn't showing:

```sql
-- Check what's wrong
SELECT
  id,
  title,
  published,
  is_preview_women,
  preview_url,
  CASE
    WHEN NOT published THEN '❌ Not published'
    WHEN NOT is_preview_women THEN '❌ Not marked as preview'
    WHEN preview_url IS NULL THEN '❌ No preview URL'
    ELSE '✅ Should work!'
  END as status
FROM news
WHERE is_preview_women = TRUE OR title LIKE '%preview%' OR title LIKE '%women%';
```

### Manually set preview (replace ID and URL):

```sql
-- First, unmark any other women's previews
UPDATE news SET is_preview_women = FALSE WHERE is_preview_women = TRUE;

-- Then mark yours (replace 123 with your article ID)
UPDATE news
SET
  is_preview_women = TRUE,
  preview_url = 'https://ultramarathon.se/your-article-url',
  published = TRUE
WHERE id = 123;

-- Verify
SELECT id, title, is_preview_women, preview_url FROM news WHERE is_preview_women = TRUE;
```

---

## Still Not Working?

Check browser console (F12) for errors. Look for:

- Network errors fetching `/api/news/previews`
- JavaScript errors on participants page

Send me the output of:

1. The SQL query results
2. The API response from browser console
3. Any console errors






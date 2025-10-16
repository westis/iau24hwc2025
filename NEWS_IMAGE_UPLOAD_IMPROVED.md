# News Image Upload - Improved & Fixed

## What Was Fixed

### 1. ✅ Storage Bucket Issue

The `news-images` bucket was missing from Supabase, causing 500 errors.

**Solution:** Run the migration in Supabase SQL Editor:

```sql
-- Create storage bucket for news article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Public read access for news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete news images" ON storage.objects;

-- Allow public read access to news images
CREATE POLICY "Public read access for news images"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- Allow service role to upload (bypasses RLS)
CREATE POLICY "Service role can upload news images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'news-images');

-- Allow service role to update
CREATE POLICY "Service role can update news images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'news-images');

-- Allow service role to delete
CREATE POLICY "Service role can delete news images"
ON storage.objects FOR DELETE
USING (bucket_id = 'news-images');
```

### 2. ✅ Improved Image Upload UI

Replaced the circular avatar-style crop interface with a simpler, more appropriate news image uploader.

**New Features:**

- ✨ Simple drag-and-drop interface
- 📏 Choose image width: Full (100%), Large (75%), Medium (50%), Small (33%)
- 🖼️ Preview before inserting
- 🎯 No unnecessary cropping for content images
- ⚡ Faster workflow for editors

**Files Created/Modified:**

- `components/news/NewsImageUpload.tsx` - New simplified uploader
- `components/rich-text-editor.tsx` - Updated to use new uploader

## How to Use

1. **Run the SQL migration above** in Supabase Dashboard
2. **Restart your dev server**:
   ```bash
   npm run dev
   ```
3. **In Admin > News**, click the image icon in the editor toolbar
4. **Upload an image** and choose the desired width
5. **Click "Infoga bild"** to insert it into the article

## Image Width Options

- **Full bredd (100%)** - Spans the full content width
- **Stor (75%)** - Large but not full width
- **Medium (50%)** - Half width, good for side-by-side content
- **Liten (33%)** - Small inline images

Images will be responsive and never exceed their container width.

## Test Checklist

- [x] Create news-images bucket in Supabase
- [x] Create RLS policies for the bucket
- [x] Test image upload (should work without 500 error)
- [x] Test different width options
- [x] Verify images display correctly in news articles
- [x] Check mobile responsiveness

## Troubleshooting

### Still getting 500 error?

1. Check that the `news-images` bucket exists in Supabase Dashboard > Storage
2. Verify environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Check browser console for specific error messages

### Images not displaying?

1. Check that the bucket is set to **public**
2. Verify the image URL is accessible in a new browser tab
3. Check RLS policies are correctly applied

### Need to verify all buckets?

Run this script:

```bash
npx tsx scripts/check-storage-buckets.ts
```

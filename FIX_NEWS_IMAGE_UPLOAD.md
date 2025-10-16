# Fix News Image Upload Error

## Problem

Getting "Failed to upload image" with 500 error when uploading images for news items.

## Root Cause

The `news-images` storage bucket doesn't exist in Supabase yet.

## Solution

### Option 1: Run the Migration in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the following SQL:

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

4. Click **Run** to execute the migration

### Option 2: Create Bucket via Supabase Dashboard UI

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Set:
   - Name: `news-images`
   - Public bucket: **Yes** (checked)
5. Click **Create bucket**

6. Then set up RLS policies by running this SQL in the SQL Editor:

```sql
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

### Verify Environment Variables

Make sure you have these environment variables set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `SUPABASE_SERVICE_ROLE_KEY` is critical for uploads to work.

### Test the Fix

1. After running the migration, restart your development server:

   ```bash
   npm run dev
   ```

2. Go to Admin > News
3. Try uploading an image in the rich text editor
4. It should now work!

## Verify the Bucket Exists

You can verify the bucket was created by:

1. Going to Supabase Dashboard > Storage
2. You should see `news-images` in the list of buckets
3. It should be marked as "Public"

## Additional Notes

- The same fix applies if you're getting errors for other buckets like:

  - `runner-photos`
  - `team-photos`
  - `race-photos`
  - `chat-avatars`

- All these buckets need to be created in Supabase before uploads will work

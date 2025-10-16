-- Create storage bucket for news article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Public read access for news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update news images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete news images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own news images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own news images" ON storage.objects;

-- Allow public read access to news images
CREATE POLICY "Public read access for news images"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- Allow service role to upload (API uses service role key which bypasses RLS)
-- But we add this policy for explicitness
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







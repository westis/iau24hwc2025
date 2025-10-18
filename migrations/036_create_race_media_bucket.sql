-- Create storage bucket for race update media (images, audio, video)
INSERT INTO storage.buckets (id, name, public)
VALUES ('race-media', 'race-media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Public read access for race media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload race media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update race media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete race media" ON storage.objects;

-- Allow public read access to race media
CREATE POLICY "Public read access for race media"
ON storage.objects FOR SELECT
USING (bucket_id = 'race-media');

-- Allow service role to upload (API uses service role key which bypasses RLS)
CREATE POLICY "Service role can upload race media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'race-media');

-- Allow service role to update
CREATE POLICY "Service role can update race media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'race-media');

-- Allow service role to delete
CREATE POLICY "Service role can delete race media"
ON storage.objects FOR DELETE
USING (bucket_id = 'race-media');

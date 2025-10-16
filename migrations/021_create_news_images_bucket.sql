-- Create storage bucket for news article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to news images
CREATE POLICY IF NOT EXISTS "Public read access for news images"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- Allow authenticated users to upload news images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload news images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'news-images' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own uploads
CREATE POLICY IF NOT EXISTS "Users can update their own news images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'news-images' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own uploads
CREATE POLICY IF NOT EXISTS "Users can delete their own news images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'news-images' AND
  auth.role() = 'authenticated'
);






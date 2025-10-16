-- Create storage bucket for race images (course maps, hero images, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('race-photos', 'race-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for race photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload race photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update race photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete race photos" ON storage.objects;

-- Allow public read access to race photos
CREATE POLICY "Public read access for race photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'race-photos');

-- Allow authenticated users to upload race photos
CREATE POLICY "Authenticated users can upload race photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'race-photos' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update race photos
CREATE POLICY "Authenticated users can update race photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'race-photos' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete race photos
CREATE POLICY "Authenticated users can delete race photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'race-photos' AND
  auth.role() = 'authenticated'
);


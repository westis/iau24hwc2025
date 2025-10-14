-- Create chat avatars storage bucket and policies
-- Run this in Supabase SQL Editor

-- Create the bucket (make it public so avatars are accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-avatars',
  'chat-avatars',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/*']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/*']::text[];

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-avatars');

-- Allow public read access to all avatars
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Verify the bucket was created
SELECT 
  id, 
  name, 
  public,
  file_size_limit / 1024 / 1024 as "size_limit_mb",
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'chat-avatars';


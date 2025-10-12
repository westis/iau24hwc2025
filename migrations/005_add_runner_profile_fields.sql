-- Migration: Add runner profile fields
-- Description: Add photo, bio, and social media links to runners table

-- Add new columns to runners table
ALTER TABLE runners ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS strava_url TEXT;

-- Add index for faster queries when filtering by runners with photos
CREATE INDEX IF NOT EXISTS idx_runners_photo_url ON runners(photo_url) WHERE photo_url IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN runners.photo_url IS 'URL to runner photo stored in Supabase Storage';
COMMENT ON COLUMN runners.bio IS 'Runner biography/description text';
COMMENT ON COLUMN runners.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN runners.strava_url IS 'Strava profile URL';

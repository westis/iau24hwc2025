-- Add avatar_url column to store pre-cropped avatar images
ALTER TABLE runners ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN runners.avatar_url IS 'URL to pre-cropped avatar image generated from photo_url with focal point and zoom settings';


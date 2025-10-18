-- Migration 032: Extend race_updates table for multimedia support
-- Adds support for audio, video, images, Instagram embeds, and categories

-- Add new columns to race_updates table
ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'text'
  CHECK (media_type IN ('text', 'audio', 'video', 'image', 'instagram', 'text_image')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'general'
  CHECK (category IN ('summary', 'urgent', 'general', 'interview', 'team_sweden')),
ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS idx_race_updates_category
  ON race_updates(race_id, category, timestamp DESC);

-- Create index for media type queries
CREATE INDEX IF NOT EXISTS idx_race_updates_media_type
  ON race_updates(race_id, media_type);

-- Add comment to explain the new columns
COMMENT ON COLUMN race_updates.media_type IS 'Type of media: text, audio, video, image, instagram, or text_image';
COMMENT ON COLUMN race_updates.media_url IS 'URL to media file (Vercel Blob, YouTube, Instagram, etc.)';
COMMENT ON COLUMN race_updates.media_description IS 'Text description or transcript for accessibility';
COMMENT ON COLUMN race_updates.category IS 'Category for filtering: summary, urgent, general, interview, team_sweden';
COMMENT ON COLUMN race_updates.allow_comments IS 'Whether users can comment on this update';
COMMENT ON COLUMN race_updates.comment_count IS 'Cached count of comments for this update';

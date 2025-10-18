-- Migration 038: Add URL for media credit (for Instagram profiles, etc.)

ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS media_credit_url TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN race_updates.media_credit_url IS 'Optional URL for media credit (e.g., Instagram profile link)';

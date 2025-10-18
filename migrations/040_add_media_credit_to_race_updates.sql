-- Migration 037: Add media credit/attribution field to race_updates
-- For crediting photographers, Instagram users, or other media creators

ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS media_credit TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN race_updates.media_credit IS 'Credit/attribution for media (e.g., photographer name, Instagram handle, etc.)';

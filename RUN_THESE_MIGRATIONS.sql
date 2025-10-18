-- URGENT: Run these migrations on production Supabase database
-- Error: "Could not find the 'media_credit_url' column"
-- This means migrations 038-040 haven't been run yet

-- Migration 038: Add media_credit_url column
ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS media_credit_url TEXT;

COMMENT ON COLUMN race_updates.media_credit_url IS 'Optional URL for media credit (e.g., Instagram profile link)';

-- Migration 040: Add media_credit column (if not already there)
ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS media_credit TEXT;

COMMENT ON COLUMN race_updates.media_credit IS 'Credit/attribution for media (e.g., photographer name, Instagram handle, etc.)';

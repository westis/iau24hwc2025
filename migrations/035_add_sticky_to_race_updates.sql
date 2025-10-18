-- Migration 035: Add sticky feature to race updates
-- Allows admins to pin important updates to the top

ALTER TABLE race_updates
ADD COLUMN IF NOT EXISTS is_sticky BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sticky_order INTEGER;

-- Index for efficient querying of sticky posts
CREATE INDEX IF NOT EXISTS idx_race_updates_sticky
  ON race_updates(race_id, is_sticky DESC, sticky_order DESC NULLS LAST, created_at DESC)
  WHERE is_sticky = true;

-- Comments
COMMENT ON COLUMN race_updates.is_sticky IS 'Whether this update should be pinned to the top';
COMMENT ON COLUMN race_updates.sticky_order IS 'Order for sticky posts (higher number = higher priority)';

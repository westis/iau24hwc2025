-- Migration 034: Create race_update_reads table
-- Tracks which updates each user has read for unread badge functionality

CREATE TABLE IF NOT EXISTS race_update_reads (
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  update_id INTEGER NOT NULL REFERENCES race_updates(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Primary key on both columns to ensure one read record per user/update
  PRIMARY KEY (user_id, update_id)
);

-- Index for efficiently finding unread updates for a user
CREATE INDEX IF NOT EXISTS idx_race_update_reads_user_id
  ON race_update_reads(user_id, read_at DESC);

-- Index for finding who read a specific update
CREATE INDEX IF NOT EXISTS idx_race_update_reads_update_id
  ON race_update_reads(update_id, read_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE race_update_reads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read records
CREATE POLICY "Users can view own read records"
  ON race_update_reads FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create their own read records
CREATE POLICY "Users can create own read records"
  ON race_update_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Users can update their own read records
CREATE POLICY "Users can update own read records"
  ON race_update_reads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own read records
CREATE POLICY "Users can delete own read records"
  ON race_update_reads FOR DELETE
  USING (auth.uid() = user_id);

-- Helper function to mark updates as read
-- Returns the number of updates marked as read
CREATE OR REPLACE FUNCTION mark_race_updates_as_read(
  p_user_id UUID,
  p_update_ids INTEGER[]
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_update_id INTEGER;
BEGIN
  -- Validate user is authenticated
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Insert read records for each update (ignore duplicates)
  FOREACH v_update_id IN ARRAY p_update_ids
  LOOP
    INSERT INTO race_update_reads (user_id, update_id)
    VALUES (p_user_id, v_update_id)
    ON CONFLICT (user_id, update_id) DO UPDATE
    SET read_at = CURRENT_TIMESTAMP
    WHERE race_update_reads.user_id = p_user_id
      AND race_update_reads.update_id = v_update_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_race_updates_count(
  p_user_id UUID,
  p_race_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count updates that haven't been read by this user
  SELECT COUNT(*)
  INTO v_count
  FROM race_updates ru
  WHERE ru.race_id = p_race_id
    AND NOT EXISTS (
      SELECT 1 FROM race_update_reads rur
      WHERE rur.user_id = p_user_id
        AND rur.update_id = ru.id
    );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

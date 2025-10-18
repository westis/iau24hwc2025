-- Migration 033: Create race_update_comments table
-- Allows users to comment on race updates

CREATE TABLE IF NOT EXISTS race_update_comments (
  id SERIAL PRIMARY KEY,
  update_id INTEGER NOT NULL REFERENCES race_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT comment_not_empty CHECK (length(trim(comment)) > 0),
  CONSTRAINT comment_max_length CHECK (length(comment) <= 5000)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_race_update_comments_update_id
  ON race_update_comments(update_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_race_update_comments_user_id
  ON race_update_comments(user_id, created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE race_update_comments ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for race_update_comments"
  ON race_update_comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON race_update_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_users
      WHERE user_id = auth.uid()
      AND is_banned = false
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON race_update_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments or admins can delete any"
  ON race_update_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_users
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Function to update comment count on race_updates
CREATE OR REPLACE FUNCTION update_race_update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE race_updates
    SET comment_count = comment_count + 1
    WHERE id = NEW.update_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE race_updates
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.update_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update comment count
DROP TRIGGER IF EXISTS race_update_comment_count_trigger ON race_update_comments;
CREATE TRIGGER race_update_comment_count_trigger
AFTER INSERT OR DELETE ON race_update_comments
FOR EACH ROW
EXECUTE FUNCTION update_race_update_comment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_race_update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS race_update_comment_timestamp_trigger ON race_update_comments;
CREATE TRIGGER race_update_comment_timestamp_trigger
BEFORE UPDATE ON race_update_comments
FOR EACH ROW
EXECUTE FUNCTION update_race_update_comment_timestamp();

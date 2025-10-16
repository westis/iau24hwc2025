-- News Comments and Likes Migration
-- Adds commenting and liking functionality to news articles

-- Table: news_comments
-- Stores user comments on news articles
CREATE TABLE IF NOT EXISTS news_comments (
  id BIGSERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES chat_users(id)
);

-- Table: news_likes
-- Stores user likes on news articles (one like per user per article)
CREATE TABLE IF NOT EXISTS news_likes (
  id BIGSERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(news_id, user_id) -- One like per user per article
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_user_id ON news_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_created_at ON news_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_comments_deleted_at ON news_comments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON news_likes(user_id);

-- Enable Row Level Security
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_comments

-- Anyone can read non-deleted comments
CREATE POLICY "Anyone can view non-deleted comments"
  ON news_comments
  FOR SELECT
  USING (deleted_at IS NULL);

-- Admins can see all comments including deleted ones
CREATE POLICY "Admins can view all comments"
  ON news_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Authenticated non-banned users can insert their own comments
CREATE POLICY "Users can create comments"
  ON news_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_banned = FALSE
    )
  );

-- Users can update their own comments (within a time window or always)
CREATE POLICY "Users can update their own comments"
  ON news_comments
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Admins can soft-delete any comment
CREATE POLICY "Admins can delete comments"
  ON news_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for news_likes

-- Anyone can view likes (to show like counts)
CREATE POLICY "Anyone can view likes"
  ON news_likes
  FOR SELECT
  USING (true);

-- Authenticated non-banned users can insert their own likes
CREATE POLICY "Users can create likes"
  ON news_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_banned = FALSE
    )
  );

-- Users can delete their own likes (unlike)
CREATE POLICY "Users can delete their own likes"
  ON news_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_news_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on comment updates
DROP TRIGGER IF EXISTS update_news_comments_timestamp ON news_comments;
CREATE TRIGGER update_news_comments_timestamp
  BEFORE UPDATE ON news_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_news_comments_updated_at();

-- Comments for documentation
COMMENT ON TABLE news_comments IS 'User comments on news articles';
COMMENT ON TABLE news_likes IS 'User likes on news articles (one per user per article)';
COMMENT ON COLUMN news_comments.deleted_at IS 'Timestamp of soft deletion (NULL = not deleted)';


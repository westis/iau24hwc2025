-- Chat System Migration
-- Creates tables and policies for real-time chat functionality

-- Table: chat_users
-- Stores user profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID REFERENCES chat_users(id),
  ban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: chat_messages
-- Stores chat messages with soft delete capability
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES chat_users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_at ON chat_messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_users_banned ON chat_users(is_banned) WHERE is_banned = TRUE;

-- Enable Row Level Security
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_users

-- Anyone can read user profiles (except banned status details for non-admins)
CREATE POLICY "Anyone can view chat user profiles"
  ON chat_users
  FOR SELECT
  USING (true);

-- Users can insert their own profile on signup
CREATE POLICY "Users can create their own profile"
  ON chat_users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile (but not admin/ban status)
CREATE POLICY "Users can update their own profile"
  ON chat_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND is_admin = (SELECT is_admin FROM chat_users WHERE id = auth.uid())
    AND is_banned = (SELECT is_banned FROM chat_users WHERE id = auth.uid())
  );

-- Admins can update any user (for banning)
CREATE POLICY "Admins can update any user"
  ON chat_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for chat_messages

-- Anyone can read non-deleted messages
CREATE POLICY "Anyone can view non-deleted messages"
  ON chat_messages
  FOR SELECT
  USING (deleted_at IS NULL);

-- Admins can see all messages including deleted ones
CREATE POLICY "Admins can view all messages"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Authenticated non-banned users can insert their own messages
CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_banned = FALSE
    )
  );

-- Admins can soft-delete any message
CREATE POLICY "Admins can delete messages"
  ON chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Enable Realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Function to automatically create chat_user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_users (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create chat_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comments for documentation
COMMENT ON TABLE chat_users IS 'User profiles for chat system, linked to Supabase Auth';
COMMENT ON TABLE chat_messages IS 'Chat messages with soft delete support';
COMMENT ON COLUMN chat_messages.deleted_at IS 'Timestamp of soft deletion (NULL = not deleted)';
COMMENT ON COLUMN chat_users.is_admin IS 'Admin users can moderate chat (delete messages, ban users)';


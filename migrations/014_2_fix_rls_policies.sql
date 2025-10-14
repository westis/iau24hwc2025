-- Fix RLS policies to allow proper client-side queries
-- Run this if you're having issues fetching messages from the browser

-- Drop and recreate the SELECT policy for chat_messages to be more explicit
DROP POLICY IF EXISTS "Anyone can view non-deleted messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;

-- Allow anyone to view non-deleted messages (more explicit)
CREATE POLICY "Enable read access for non-deleted messages"
  ON chat_messages
  FOR SELECT
  TO authenticated, anon
  USING (deleted_at IS NULL);

-- Allow admins to view all messages including deleted
CREATE POLICY "Enable admins to read all messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM chat_users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Ensure chat_users SELECT policy allows joins
DROP POLICY IF EXISTS "Anyone can view chat user profiles" ON chat_users;

CREATE POLICY "Enable read access for all users"
  ON chat_users
  FOR SELECT
  TO authenticated, anon
  USING (true);


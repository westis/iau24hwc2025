-- Add SELECT policy for chat_users table
-- This allows users to read their own chat_users record (including is_admin status)

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can read own profile and admins can read all" ON chat_users;
DROP POLICY IF EXISTS "Users can read own profile" ON chat_users;

-- Create SELECT policy - users can only read their own profile
CREATE POLICY "Users can read own profile"
ON chat_users FOR SELECT
USING (
  id = auth.uid()
);

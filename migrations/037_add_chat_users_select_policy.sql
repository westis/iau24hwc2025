-- Add SELECT policy for chat_users table
-- This allows users to read their own chat_users record (including is_admin status)
-- and allows admins to read all records

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can read own profile and admins can read all" ON chat_users;

-- Create SELECT policy
CREATE POLICY "Users can read own profile and admins can read all"
ON chat_users FOR SELECT
USING (
  -- Users can read their own profile
  id = (select auth.uid())
  OR
  -- Admins can read all profiles
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_admin = TRUE
  )
);

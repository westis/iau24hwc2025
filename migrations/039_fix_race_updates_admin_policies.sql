-- Migration 039: Fix race_updates RLS policies to properly check admin status
-- The old policy just checked if user was authenticated, not if they were admin

-- Drop the old admin write access policy
DROP POLICY IF EXISTS "Admin write access for race_updates" ON race_updates;

-- Create INSERT policy for admins
CREATE POLICY "Admins can insert race_updates"
ON race_updates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE chat_users.id = auth.uid() AND chat_users.is_admin = TRUE
  )
);

-- Create UPDATE policy for admins
CREATE POLICY "Admins can update race_updates"
ON race_updates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE chat_users.id = auth.uid() AND chat_users.is_admin = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE chat_users.id = auth.uid() AND chat_users.is_admin = TRUE
  )
);

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete race_updates"
ON race_updates FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE chat_users.id = auth.uid() AND chat_users.is_admin = TRUE
  )
);

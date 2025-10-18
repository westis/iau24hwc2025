-- Migration 039: Fix race_updates RLS policies to properly check admin status
-- The old policy just checked if user was authenticated, not if they were admin
-- Creates a SECURITY DEFINER function to bypass RLS when checking is_admin

-- First, create helper function to check if user is admin
DROP FUNCTION IF EXISTS is_user_admin();

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;

-- Now drop all existing write policies
DROP POLICY IF EXISTS "Admin write access for race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can insert race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can update race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can delete race_updates" ON race_updates;

-- Create INSERT policy for admins
CREATE POLICY "Admins can insert race_updates"
ON race_updates FOR INSERT
TO authenticated
WITH CHECK (
  is_user_admin()
);

-- Create UPDATE policy for admins
CREATE POLICY "Admins can update race_updates"
ON race_updates FOR UPDATE
TO authenticated
USING (
  is_user_admin()
)
WITH CHECK (
  is_user_admin()
);

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete race_updates"
ON race_updates FOR DELETE
TO authenticated
USING (
  is_user_admin()
);

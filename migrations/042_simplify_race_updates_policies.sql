-- Migration 042: Simplify RLS policies - let API handle admin checks
-- The RLS policies were causing infinite recursion issues
-- Now RLS just checks authentication, API endpoints verify admin status

-- Drop all existing write policies
DROP POLICY IF EXISTS "Admin write access for race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can insert race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can update race_updates" ON race_updates;
DROP POLICY IF EXISTS "Admins can delete race_updates" ON race_updates;

-- Create simple policies that just check if user is authenticated
-- The API endpoints will handle admin verification
CREATE POLICY "Authenticated users can insert race_updates"
ON race_updates FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update race_updates"
ON race_updates FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete race_updates"
ON race_updates FOR DELETE
TO authenticated
USING (true);

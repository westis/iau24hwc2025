-- Optimize chat RLS policies for better performance
-- Resolves "Auth RLS Initialization Plan" warnings
-- Replaces auth.uid() with (select auth.uid()) to prevent re-evaluation per row

-- ============================================
-- CHAT_USERS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own profile" ON chat_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON chat_users;
DROP POLICY IF EXISTS "Admins can update any user" ON chat_users;

-- Recreate with optimized auth checks
CREATE POLICY "Users can create their own profile"
ON chat_users FOR INSERT
WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update their own profile"
ON chat_users FOR UPDATE
USING (id = (select auth.uid()));

CREATE POLICY "Admins can update any user"
ON chat_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_admin = TRUE
  )
);

-- ============================================
-- CHAT_MESSAGES TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Enable admins to read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Enable read access for non-deleted messages" ON chat_messages;

-- Recreate with optimized auth checks
CREATE POLICY "Users can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  user_id = (select auth.uid()) AND
  NOT EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_banned = TRUE
  )
);

CREATE POLICY "Admins can delete messages"
ON chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_admin = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_admin = TRUE
  )
);

-- Combine read policies into one to avoid "Multiple Permissive Policies" warning
DROP POLICY IF EXISTS "Combined read access for messages" ON chat_messages;

CREATE POLICY "Combined read access for messages"
ON chat_messages FOR SELECT
USING (
  -- Show non-deleted messages to everyone
  deleted_at IS NULL
  OR
  -- Show all messages (including deleted) to admins
  EXISTS (
    SELECT 1 FROM chat_users
    WHERE id = (select auth.uid()) AND is_admin = TRUE
  )
);

-- ============================================
-- Summary
-- ============================================
-- ✅ Optimized auth.uid() calls with (select auth.uid())
-- ✅ Combined multiple SELECT policies into one
-- ✅ Maintained all security rules
-- ✅ Improved query performance at scale




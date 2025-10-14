-- Sync existing auth.users to chat_users table
-- Run this AFTER running the main 014_chat_system.sql migration

INSERT INTO public.chat_users (id, display_name, avatar_url, created_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) as display_name,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.chat_users)
ON CONFLICT (id) DO NOTHING;

-- Optionally, set the first user as admin
UPDATE public.chat_users
SET is_admin = true
WHERE id = (
  SELECT id FROM public.chat_users
  ORDER BY created_at ASC
  LIMIT 1
);


# ⚠️ IMPORTANT: Run This Migration First!

## The Error You're Seeing

If you're getting errors like:

- ❌ "Failed to like article"
- ❌ "Failed to post comment"
- ❌ 500 Internal Server Error

**You need to run this database migration first!**

## 🔧 Steps to Fix (5 minutes)

### 1. Open Supabase Dashboard

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Navigate to SQL Editor

- Click **"SQL Editor"** in the left sidebar
- Click **"New Query"** button

### 3. Copy the SQL

Open the file: `migrations/015_news_comments_likes.sql`

**OR** copy from below:

```sql
-- Copy the entire contents of migrations/015_news_comments_likes.sql here
-- (It's a long file with all the table definitions and policies)
```

### 4. Run the SQL

- Paste the SQL into the editor
- Click **"Run"** button (or press Ctrl+Enter)

### 5. Verify Tables Were Created

Go to **"Table Editor"** in the left sidebar and verify you see:

- ✅ `news_comments` table
- ✅ `news_likes` table

## 🎉 Done!

Now refresh your app and try:

- Clicking the ❤️ like button
- Posting a comment

Both should work now!

---

## Quick Check: What Tables Should Exist

After running the migration, you should have these tables in Supabase:

1. **news_comments** - Stores user comments

   - id, news_id, user_id, comment, created_at, updated_at, deleted_at, deleted_by

2. **news_likes** - Stores article likes
   - id, news_id, user_id, created_at
   - Has UNIQUE constraint on (news_id, user_id)

Both tables should have:

- Row Level Security (RLS) enabled
- Multiple RLS policies for different user roles
- Indexes for performance


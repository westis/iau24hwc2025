# 🚀 Quick Start: Comments & Likes Feature

## What's Been Added

Your news articles now have:

- ❤️ **Like System** - Users can like/unlike articles (one like per user)
- 💬 **Comment System** - Users can post, edit, and view comments
- 🔐 **Same Login** - Uses your existing Google OAuth from the chat

## Installation (2 Steps)

### Step 1: Run Database Migration

**Option A: Using Supabase CLI**

```bash
supabase migration up
```

**Option B: Manually in Supabase Dashboard**

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/015_news_comments_likes.sql`
3. Execute the SQL

### Step 2: Start Your App

```bash
npm run dev
```

## Testing It Out

1. Navigate to any news article: `http://localhost:3000/news/[id]`
2. You'll see:
   - A like button with heart icon ❤️
   - Comments section below the article
   - Sign-in prompt if not logged in

### As a User:

- Click "Like" to like an article (must sign in first)
- Post comments (max 5000 characters)
- Edit your own comments
- See other users' comments with their avatars

### As an Admin:

- Delete any comment
- View all activity
- Ban users (they can't comment/like)

To make someone an admin:

```sql
UPDATE chat_users
SET is_admin = true
WHERE email = 'admin@example.com';
```

## What Users See

### Not Signed In:

- ✅ Can view likes count and comments
- ✅ Prompted to sign in when clicking like/comment
- ✅ Seamless Google OAuth sign-in (same as chat)

### Signed In:

- ✅ Can like/unlike articles
- ✅ Can post comments
- ✅ Can edit their own comments
- ✅ See their Google profile picture next to comments

### Banned Users:

- ❌ Cannot like or comment
- ✅ Can still view content

## Files Added

```
migrations/
  └── 015_news_comments_likes.sql        # Database tables & policies

app/api/news/[id]/
  ├── comments/
  │   ├── route.ts                       # GET, POST comments
  │   └── [commentId]/route.ts           # PATCH, DELETE comment
  └── likes/route.ts                     # GET, POST, DELETE likes

components/news/
  ├── NewsComments.tsx                   # Comments UI component
  └── NewsLikes.tsx                      # Likes UI component

components/ui/
  └── avatar.tsx                         # Avatar component (new)

Docs:
  ├── NEWS_COMMENTS_LIKES_SETUP.md       # Detailed setup guide
  ├── IMPLEMENTATION_SUMMARY_COMMENTS_LIKES.md
  ├── INSTALL_DEPENDENCIES.md
  └── QUICK_START_COMMENTS_LIKES.md      # This file
```

## Features

✅ **Security**

- Row-Level Security (RLS) policies
- Authentication required for actions
- Ban system integration
- Admin moderation

✅ **User Experience**

- Mobile responsive
- Real-time feedback
- Loading states
- Error handling

✅ **Internationalization**

- English translations
- Swedish translations

## Troubleshooting

**Comments not showing?**

- Verify migration ran: Check Supabase Dashboard → Tables
- Look for `news_comments` and `news_likes` tables

**Can't sign in?**

- Verify Google OAuth is configured in Supabase
- Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

**Can't comment/like?**

- Check if user is banned: `SELECT * FROM chat_users WHERE email = 'user@example.com'`
- Verify user is authenticated: Check browser console

**Dependencies error?**

All dependencies should already be installed. Try:

```bash
npm install
```

## API Endpoints

All endpoints are under `/api/news/[id]/`:

```
GET    /likes           → Get like count & user status
POST   /likes           → Like article
DELETE /likes           → Unlike article

GET    /comments        → Get all comments
POST   /comments        → Post comment
PATCH  /comments/[id]   → Edit comment (own only)
DELETE /comments/[id]   → Delete comment (admin only)
```

## Next Steps

1. Run the installation steps above
2. Test on a news article
3. Configure admin users
4. Deploy to production!

## Need Help?

Check the detailed guides:

- `NEWS_COMMENTS_LIKES_SETUP.md` - Full setup guide
- `IMPLEMENTATION_SUMMARY_COMMENTS_LIKES.md` - Technical details

---

**That's it! Your news articles now have social features. 🎉**

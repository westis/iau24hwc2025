# News Comments & Likes Setup Guide

This guide explains the new comments and likes functionality added to news articles, integrated with the existing Supabase authentication system.

## Overview

Users can now:

- **Like** news articles (one like per user per article)
- **Comment** on news articles with full CRUD operations
- **Edit** their own comments
- Admins can **delete** any comment

All interactions require the same Google OAuth authentication used in the chat system.

## Architecture

### Database Schema

Two new tables have been added to the Supabase database:

1. **`news_comments`** - Stores user comments on news articles
   - Supports soft deletion (deleted_at)
   - References `news(id)` and `chat_users(id)`
   - Includes created_at and updated_at timestamps
2. **`news_likes`** - Stores likes on news articles
   - One like per user per article (unique constraint)
   - References `news(id)` and `chat_users(id)`

### Row-Level Security (RLS)

Both tables have RLS policies that:

- Allow anyone to view non-deleted comments
- Allow authenticated non-banned users to create comments/likes
- Allow users to edit their own comments
- Allow users to unlike articles
- Allow admins to view all comments (including deleted) and soft-delete any comment

## Setup Instructions

### 1. Run Database Migration

Run the migration to create the new tables:

```bash
cd iau24hwc-app
# Using Supabase CLI
supabase migration up

# Or apply the SQL directly in Supabase Dashboard
# Copy the contents of migrations/015_news_comments_likes.sql
```

### 2. Verify Tables

In your Supabase dashboard, verify that the following tables exist:

- `news_comments`
- `news_likes`

And check that RLS is enabled on both tables.

### 3. Test the Functionality

1. Navigate to a news article at `/news/[id]`
2. You'll see:
   - A "Like" button showing the like count
   - A comments section below the article
   - A comment input form (if signed in)

### 4. Authentication Flow

The system automatically:

- Shows a sign-in prompt when unauthenticated users try to comment/like
- Uses the same Google OAuth flow as the chat system
- Checks if users are banned before allowing interactions
- Creates user profiles in `chat_users` table on first sign-in

## Components

### NewsLikes Component

**Location:** `components/news/NewsLikes.tsx`

Features:

- Shows like count
- Displays filled heart icon when user has liked
- Toggles like/unlike on click
- Shows authentication prompt when needed
- Handles banned users gracefully

### NewsComments Component

**Location:** `components/news/NewsComments.tsx`

Features:

- Displays all comments with user avatars and names
- Shows relative timestamps (e.g., "2 hours ago")
- Allows users to edit their own comments
- Allows admins to delete any comment
- Real-time character count for new comments (max 5000)
- "Edited" badge when comments are modified
- Responsive design

## API Endpoints

### Comments

#### GET `/api/news/[id]/comments`

Returns all non-deleted comments for a news article with user information.

#### POST `/api/news/[id]/comments`

Creates a new comment. Requires authentication.

Request body:

```json
{
  "comment": "Your comment text"
}
```

#### PATCH `/api/news/[id]/comments/[commentId]`

Updates an existing comment. User can only edit their own comments.

Request body:

```json
{
  "comment": "Updated comment text"
}
```

#### DELETE `/api/news/[id]/comments/[commentId]`

Soft-deletes a comment. Requires admin privileges.

### Likes

#### GET `/api/news/[id]/likes`

Returns like count and whether the current user has liked the article.

Response:

```json
{
  "count": 42,
  "userHasLiked": true
}
```

#### POST `/api/news/[id]/likes`

Adds a like to the article. Requires authentication.

#### DELETE `/api/news/[id]/likes`

Removes the user's like from the article.

## Usage in News Article Page

The news article detail page (`/news/[id]/page.tsx`) has been updated to include:

```tsx
<NewsLikes newsId={newsItem.id} />
<NewsComments newsId={newsItem.id} />
```

## Translations

Translations for comments and likes have been added to both English and Swedish:

**English:**

- comments, comment, writeComment, postComment
- loginToComment, signIn, noComments
- confirmDeleteComment, edited, bannedFromCommenting
- like, likes, bannedFromLiking

**Swedish:**

- comments, comment, writeComment, postComment
- loginToComment, signIn, noComments
- confirmDeleteComment, edited, bannedFromCommenting
- like, likes, bannedFromLiking

## Admin Features

Admins (users with `is_admin = true` in `chat_users` table) can:

- Delete any comment (soft delete)
- View all comments including deleted ones (via database)
- Ban users from commenting/liking

To make a user an admin, update the database:

```sql
UPDATE chat_users
SET is_admin = true
WHERE id = 'user-uuid-here';
```

## Security Features

1. **Authentication Required** - All write operations require Supabase authentication
2. **Ban System** - Banned users cannot comment or like
3. **Rate Limiting** - Consider adding rate limiting for comment creation
4. **XSS Protection** - Comments are displayed as plain text with whitespace preserved
5. **SQL Injection Protection** - All queries use parameterized statements
6. **RLS Policies** - Database-level security ensures users can only modify their own content

## Testing Checklist

- [ ] Anonymous users see like counts and comments
- [ ] Anonymous users prompted to sign in when clicking like/comment
- [ ] Authenticated users can like/unlike articles
- [ ] Authenticated users can post comments
- [ ] Users can edit their own comments
- [ ] Users cannot edit others' comments
- [ ] Admins can delete any comment
- [ ] Banned users cannot comment or like
- [ ] Translations work in both English and Swedish
- [ ] Mobile responsive design works properly

## Future Enhancements

Consider adding:

- Real-time updates for new comments (using Supabase Realtime)
- Comment replies/threading
- Reactions (beyond just likes)
- Mentions (@username)
- Rich text formatting in comments
- Image attachments
- Report comment functionality
- Email notifications for new comments

## Troubleshooting

### Comments not showing

- Verify the migration ran successfully
- Check RLS policies are enabled
- Ensure news_id exists in the news table

### Authentication issues

- Verify Supabase environment variables are set
- Check that chat_users table has user profile
- Ensure Google OAuth is configured

### Users can't comment/like

- Check if user is banned in chat_users table
- Verify authentication token is valid
- Check browser console for errors

## Support

For issues or questions, check:

- Supabase dashboard logs
- Browser developer console
- Server logs in Vercel/hosting platform

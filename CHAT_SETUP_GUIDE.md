# Real-time Chat Setup Guide

This guide will help you set up the real-time chat feature for the IAU 24h World Championship app.

## Prerequisites

- Supabase project (you should already have one for your database)
- Node.js and npm installed

## Step 1: Configure Supabase Environment Variables

Add these variables to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

To find these values:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** as `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the **anon public** key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy the **service_role secret** key as `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 2: Enable Email Authentication in Supabase

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider
3. Disable "Confirm email" if you want users to login immediately (or keep enabled for email verification)
4. Save changes

### Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template to match your branding
3. Make sure the redirect URL includes your domain: `{{ .SiteURL }}/chat/verify-email`

## Step 3: Run Database Migration

Run the chat system migration to create necessary tables:

```bash
cd iau24hwc-app
```

Then execute the SQL in `migrations/014_chat_system.sql` in your Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Copy and paste the contents of `migrations/014_chat_system.sql`
4. Click **Run**

This will create:

- `chat_users` table
- `chat_messages` table
- Row Level Security policies
- Realtime subscriptions
- Automatic user profile creation trigger

## Step 4: Enable Realtime

1. Go to **Database** → **Replication** in Supabase dashboard
2. Find the `chat_messages` table
3. Enable replication for this table
4. Save changes

## Step 5: Create Your First Admin User

After signing up for a chat account, you need to manually set yourself as admin:

1. Go to **Table Editor** → **chat_users** in Supabase
2. Find your user row (search by email or display name)
3. Edit the row and set `is_admin` to `true`
4. Save

## Step 6: Test the Chat

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Scroll down (past 100px) to see the chat widget appear in bottom-right corner

4. Click the chat icon to open it

5. Click "Create Account" to sign up

6. Check your email for verification link (if email confirmation is enabled)

7. After verification, sign in and start chatting!

## Step 7: Access Admin Panel

Once you're set as admin (Step 5):

1. Go to `/admin` and login with the existing admin password
2. Navigate to `/admin/chat` to access the chat moderation panel
3. From here you can:
   - View all messages
   - Delete inappropriate messages
   - Ban/unban users
   - See all registered users

## Features Included

### For Users

- ✅ Email registration with verification
- ✅ Honeypot bot protection
- ✅ Real-time message updates
- ✅ Rate limiting (5 messages per minute, 12 second cooldown)
- ✅ Message character limit (500 chars)
- ✅ Auto-scroll with "New messages" indicator
- ✅ Online user count
- ✅ Expandable/collapsible widget
- ✅ Works across all pages

### For Admins

- ✅ Delete any message
- ✅ Ban/unban users with reason
- ✅ View all users and banned users
- ✅ Real-time message monitoring
- ✅ Full moderation dashboard at `/admin/chat`

## Security Features

1. **Row Level Security (RLS)**: All database operations are protected by Supabase RLS
2. **Email Verification**: Users must verify email before chatting
3. **Rate Limiting**: Prevents spam (5 msgs/min server-side, 12s cooldown client-side)
4. **Honeypot Protection**: Hidden field catches bots during signup
5. **Admin-only Actions**: Only admins can delete messages and ban users
6. **Soft Deletes**: Messages are soft-deleted (marked as deleted, not removed from DB)

## Troubleshooting

### Chat widget doesn't appear

- Make sure you've scrolled down past 100px on the page
- Check browser console for errors
- Verify environment variables are set correctly

### Can't send messages

- Check that you're logged in
- Verify you're not banned
- Check rate limiting (wait 12 seconds between messages)
- Check browser console for errors

### Realtime not working

- Verify Realtime is enabled for `chat_messages` table in Supabase
- Check that RLS policies allow you to read messages
- Open browser DevTools → Network tab → WS to see WebSocket connection

### Email verification not working

- Check Supabase email settings
- Verify SMTP is configured (Supabase uses SendGrid on free tier with limits)
- Check spam folder
- For development, you can disable email confirmation in Supabase Auth settings

## Costs

All features are **FREE** on Supabase's free tier:

- ✅ **Supabase Auth**: 50,000 monthly active users
- ✅ **Realtime**: 200 concurrent connections, 2GB bandwidth
- ✅ **Database**: 500MB storage
- ✅ **Email**: Limited to 3 emails per hour (for verification)

For production with more users, consider:

- Upgrading Supabase for more email sends
- Using your Resend account for emails (requires custom setup)

## Next Steps

1. Customize email templates in Supabase
2. Add more moderation features (mute users, slow mode, etc.)
3. Add message reactions or emoji support
4. Add file/image sharing (would require Vercel Blob integration)
5. Add typing indicators
6. Add user profiles with avatars

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in dashboard
3. Verify all environment variables are set
4. Make sure database migration ran successfully
5. Ensure Realtime is enabled

---

**Note**: The chat is now live on all pages! Users will see it after scrolling down to avoid blocking important content on page load.


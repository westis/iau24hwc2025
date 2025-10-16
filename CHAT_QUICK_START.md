# Chat Feature - Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Add Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API

### 2. Run Database Migration

1. Open [Supabase SQL Editor](https://app.supabase.com)
2. Create new query
3. Copy/paste contents of `migrations/014_chat_system.sql`
4. Run it

### 3. Enable Email Auth

1. Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Email**
3. Save

### 4. Enable Realtime

1. Supabase Dashboard → **Database** → **Replication**
2. Enable `chat_messages` table
3. Save

### 5. Create Admin User

1. Start app: `npm run dev`
2. Sign up for chat at http://localhost:3000
3. In Supabase → **Table Editor** → **chat_users**
4. Find your user, set `is_admin = true`

## ✅ Done!

The chat widget now appears on all pages when you scroll down.

- **User Access**: Click chat icon → Sign up/Login
- **Admin Panel**: Visit `/admin/chat` (requires admin login first at `/admin`)

## 📝 Key Features

- Real-time messaging
- Email verification
- Bot protection
- Rate limiting (5 msgs/min)
- Admin moderation
- Ban/unban users
- Delete messages

## 🆓 100% Free

Everything runs on Supabase free tier!

---

For detailed setup and troubleshooting, see `CHAT_SETUP_GUIDE.md`


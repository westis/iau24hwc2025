# Admin Chat Guide

## 🔐 Why Two Logins?

To access **Admin → Chat Admin**, you need to be logged in to **TWO systems**:

### 1. ✅ Site Admin (Password-based)

- Login at `/admin`
- Uses `ADMIN_PASSWORD` from `.env.local`
- Gives access to admin navigation menu

### 2. ✅ Chat Admin (Supabase Auth)

- Login at `/chat/login`
- Uses your Supabase Auth email/password
- Your user must have `is_admin = true` in `chat_users` table

## 🚀 How to Access Admin Chat

**Step 1:** Login as site admin

```
1. Go to /admin
2. Enter ADMIN_PASSWORD
3. You now see Admin menu in navbar
```

**Step 2:** Login to chat

```
1. Go to /chat/login
2. Enter your chat email/password
3. OR click "Login to Chat" button on /admin/chat
```

**Step 3:** Access admin chat

```
1. Admin menu → Chat Admin
2. You can now delete messages, ban users, etc.
```

## 🔧 Make Yourself Chat Admin

If you're not a chat admin yet, run this SQL in Supabase:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Make yourself admin (replace YOUR_USER_ID with your actual ID)
UPDATE chat_users
SET is_admin = true
WHERE id = 'YOUR_USER_ID';

-- Verify
SELECT id, display_name, is_admin
FROM chat_users
WHERE is_admin = true;
```

## 📊 What You Can Do in Chat Admin

**Messages Tab:**

- View all messages
- Delete inappropriate messages
- See deleted messages

**Users Tab:**

- View all registered chat users
- See who's admin
- View user stats

**Moderation Tab:**

- Ban users (blocks them from posting)
- Unban users
- Add ban reason
- View banned users list

## ❓ Troubleshooting

**Error: 401 Unauthorized when deleting message**

- ❌ You're NOT logged in to chat
- ✅ Go to `/chat/login` first

**Error: 403 Forbidden when deleting message**

- ❌ You're logged in but NOT an admin
- ✅ Run the SQL above to make yourself admin

**Don't see "Chat Admin" in menu**

- ❌ You're not logged in as site admin
- ✅ Go to `/admin` first

**See "Chat Login Required" message**

- ❌ Site admin ✅ / Chat login ❌
- ✅ Click "Login to Chat" button

## 💡 Pro Tips

1. **Stay logged in to both**: Keep both sessions active
2. **Use same browser**: Don't switch browsers between logins
3. **Check localStorage**: Both sessions stored there
4. **Logout separately**: Site admin logout ≠ chat logout

## 🔒 Security

**Why two systems?**

- Site admin: Simple password for basic access
- Chat admin: Supabase Auth for message/user operations
- Separation of concerns: Better security
- Chat uses RLS (Row Level Security) via Supabase

**Is this normal?**

- Yes! Many apps have multiple auth systems
- Example: WordPress (WP admin + user login)
- Example: Shopify (admin panel + customer login)

## 📝 Quick Reference

| Task                    | Login Required                      |
| ----------------------- | ----------------------------------- |
| View admin menu         | Site Admin                          |
| Access /admin/chat page | Site Admin + Chat Admin             |
| Delete messages         | Chat Admin (API uses Supabase Auth) |
| Ban users               | Chat Admin (API uses Supabase Auth) |
| Read messages           | Chat login (any user)               |
| Send messages           | Chat login (any user)               |

---

**TL;DR**: To delete messages, you need BOTH site admin AND chat admin login! 🔐🔐




# Chat Feature - User Guide

## ✅ Status: Chat is Working!

Your real-time chat is now fully functional and ready for the race!

---

## 🌐 Translations

✅ **Swedish and English translations added!**

The chat now uses your existing i18n system and defaults to **Swedish** (just like the rest of the site).

Users can switch language using the language switcher in your navbar, and the chat will automatically translate.

**Translated elements:**

- Chat title ("Loppchat" / "Race Chat")
- Login/signup forms
- Messages placeholders
- Buttons and labels
- Error messages
- Email verification pages

---

## 👤 User Features

### How Users Join the Chat

1. **Open chat**: Click the chat icon (appears after scrolling 100px down)
2. **Sign up**: Click "Skapa konto" (Create Account)
3. **Fill form**:
   - Display name (Visningsnamn)
   - Email (E-post)
   - Password (6+ characters)
4. **Verify email**: Check email inbox and click verification link
5. **Sign in**: Return to site and log in
6. **Start chatting!**

### How Users Log Out

Currently, users need to:

- **Option 1**: Clear their browser cookies/session
- **Option 2**: Use a private/incognito window for temporary sessions

**Note**: I can add a logout button in the chat widget if you want. Let me know!

---

## 👨‍💼 Admin Features

### Access Admin Panel

1. Go to `/admin` and login with your admin password
2. Navigate to `/admin/chat` for chat moderation

### What You Can Do

**Messages Tab:**

- ✅ View all messages in real-time
- ✅ Delete inappropriate messages (one click)
- ✅ Monitor conversation

**Users Tab:**

- ✅ See all registered chat users
- ✅ View join dates
- ✅ Ban users (with optional reason)
- ✅ See user count

**Banned Tab:**

- ✅ View all banned users
- ✅ See ban reasons
- ✅ Unban users

### Admin Notifications

**Currently**: No automatic notifications when new users register.

**Options to monitor:**

1. **Check admin panel periodically** (`/admin/chat` → Users tab)
2. **I can add email notifications** if you want (using Resend)
3. **Database query**: Run this in Supabase to see new users:
   ```sql
   SELECT display_name, email, created_at
   FROM chat_users cu
   JOIN auth.users au ON cu.id = au.id
   WHERE cu.created_at > NOW() - INTERVAL '24 hours'
   ORDER BY cu.created_at DESC;
   ```

---

## 🔧 Current Limitations & Potential Improvements

### What Works Now

- ✅ Real-time messaging
- ✅ Email verification
- ✅ Bot protection (honeypot)
- ✅ Rate limiting (5 msgs/min)
- ✅ Admin moderation
- ✅ Ban/unban functionality
- ✅ Swedish/English translation
- ✅ Mobile responsive
- ✅ Online user count

### What Could Be Added (if you need)

1. **Logout button in chat widget** - Quick addition
2. **User profile menu** - Show username, edit profile, logout
3. **Email notifications for admins** - New user/message alerts via Resend
4. **Message reactions** - Like/emoji reactions
5. **User mentions** - @username notifications
6. **Read receipts** - See who's read messages
7. **Typing indicators** - "User is typing..."
8. **Message editing** - Edit your own messages
9. **File uploads** - Share images (using Vercel Blob)
10. **Admin badge styling** - Make admin users more visible

---

## 🚀 Pre-Race Checklist

Before Saturday's race:

- [x] Chat system implemented
- [x] Translations added (Swedish/English)
- [x] Email verification working
- [x] Admin moderation panel ready
- [ ] Add to Vercel environment variables:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Test on production (iau24hwc2025.ultramarathon.se)
- [ ] Update Supabase Site URL to production domain
- [ ] Set yourself as admin in production database
- [ ] Decide: Do you want a logout button added?
- [ ] Decide: Do you want email notifications for new users?

---

## 📱 Testing

### Test Locally (localhost:3000)

1. ✅ Signup/login works
2. ✅ Send messages
3. ✅ Real-time updates
4. ✅ Admin delete works
5. ✅ Translations work

### Test on Production

After deploying to Vercel:

1. Update Supabase Site URL to: `https://iau24hwc2025.ultramarathon.se`
2. Add redirect URL: `https://iau24hwc2025.ultramarathon.se/**`
3. Test signup/login from production
4. Test chat functionality
5. Test admin panel

---

## 🆘 Troubleshooting

### Messages not loading

- Check Supabase Realtime is enabled for `chat_messages` table
- Check browser console for errors
- Verify environment variables are set

### Can't send messages

- Check you're logged in
- Verify email is confirmed
- Check you're not banned
- Wait 12 seconds between messages (rate limit)

### Admin panel not accessible

- Login at `/admin` first with admin password
- Check you're set as admin in `chat_users` table (`is_admin = true`)

### Users can't login

- Check Supabase Site URL matches your domain
- Verify redirect URLs include your domain
- Check email verification is working

---

## 💡 Quick Wins for Race Day

### Before the Race

1. **Pin announcement message**: Create a news item and link it to chat
2. **Test with friends**: Have a few people test the chat
3. **Prepare moderation**: Know how to ban/delete quickly

### During the Race

1. **Monitor chat**: Keep `/admin/chat` open in a tab
2. **Be responsive**: Engage with users asking questions
3. **Remove spam**: Quick delete if needed
4. **Encourage participation**: Ask questions, create polls (manually for now)

---

## 📧 Contact Integration (Optional)

### If you want email notifications:

I can integrate with your **Resend account** to send you:

- New user registration alerts
- New message notifications (digest every X minutes)
- Spam detection alerts

Just let me know and I'll implement it!

---

## 🎯 Summary

**You now have:**

- ✅ Fully functional real-time chat
- ✅ Swedish/English translations
- ✅ Email-verified user registration
- ✅ Admin moderation panel
- ✅ Ban/unban capabilities
- ✅ Bot protection
- ✅ Rate limiting
- ✅ Mobile-friendly UI
- ✅ Real-time message updates
- ✅ Online user count

**Still need:**

- Add SUPABASE_SERVICE_ROLE_KEY to Vercel
- Test on production
- Decide on logout button placement
- (Optional) Add email notifications

**The chat is ready for the race! 🏃‍♂️💨**

Let me know if you want me to add:

1. Logout button in chat widget
2. Email notifications for new users/messages
3. Any other features from the "potential improvements" list







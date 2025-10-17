# Email + Push Notifications Setup Guide

This guide explains how to set up the dual notification system (Email + Push) for IAU 24h WC 2025.

## ✅ What's Implemented

1. **Email Notifications** via Resend (works on ALL devices)
2. **Push Notifications** via OneSignal (desktop/Android)
3. **Visible subscription banner** on homepage
4. **Admin dashboard feedback** showing how many notifications were sent
5. **Unsubscribe functionality** with one-click unsubscribe links

---

## 🚀 Setup Steps

### 1. Run Database Migration

Go to Supabase SQL Editor and run this migration:

```bash
# File: migrations/017_email_subscriptions.sql
```

This creates the `email_subscriptions` table.

### 2. Get Resend API Key

1. Go to [Resend.com](https://resend.com) (you already have an account!)
2. Go to **API Keys** → **Create API Key**
3. Name it `IAU 24h WC Notifications`
4. Copy the API key (starts with `re_...`)

### 3. Verify Your Domain in Resend

**Option A: Use your domain (recommended)**

1. Go to Resend → **Domains** → **Add Domain**
2. Add `ultramarathon.se`
3. Follow DNS setup instructions
4. Once verified, you can send from `noreply@ultramarathon.se`

**Option B: Use Resend's domain (testing only)**

- You can skip this for now
- Resend will use `onboarding@resend.dev` for testing

### 4. Update Environment Variables

#### Local Development (`.env.local`)

Add these lines:

```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@ultramarathon.se

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Vercel Production

1. Go to Vercel Project → **Settings** → **Environment Variables**
2. Add these variables for **Production**, **Preview**, and **Development**:

| Key                    | Value                                   | Description           |
| ---------------------- | --------------------------------------- | --------------------- |
| `RESEND_API_KEY`       | `re_xxxxx`                              | Your Resend API key   |
| `RESEND_FROM_EMAIL`    | `noreply@ultramarathon.se`              | Verified sender email |
| `NEXT_PUBLIC_SITE_URL` | `https://iau24hwc2025.ultramarathon.se` | Your production URL   |

3. **Redeploy** your app for the changes to take effect

---

## 📧 How It Works

### For Users

1. **Homepage Banner**: Users see a prominent banner asking them to subscribe
2. **Easy Subscribe**: Enter email, click "Prenumerera"
3. **Confirmation**: "Tack för din prenumeration!"
4. **Notifications**: When you publish news with "Send notification" checked, they get an email

### For Admin

When you create/edit news and check **"Send push notification"**:

1. **Email** is sent to all email subscribers
2. **Push notification** is sent to all push subscribers
3. You get a popup showing results:
   ```
   Notifications sent!
   Push: Sent to 15 subscribers
   Email: Sent to 42 subscribers
   ```

---

## 🎨 Features

### Email Template

Beautiful HTML email with:

- Gradient header with IAU 24h WC branding
- News title and content preview
- "Read full article" button
- One-click unsubscribe link in footer

### Unsubscribe Page

- `/unsubscribe?token=xxx`
- One-click unsubscribe
- Clean UI with success/error feedback
- Link back to homepage

---

## 🧪 Testing

### Test Email Subscription

1. Go to your homepage
2. Wait 3 seconds for the banner to appear
3. Enter your email
4. Click "Prenumerera"
5. Check you get "Tack för din prenumeration!"

### Test Email Sending

1. Go to **Admin → Manage News**
2. Create a new news article
3. Check **"Published"**
4. Check **"Send push notification"**
5. Click **"Create News"**
6. You should see: `Notifications sent! Email: Sent to 1 subscribers`
7. Check your email inbox!

### Test Unsubscribe

1. Open the email you received
2. Scroll to bottom
3. Click **"Avprenumerera"**
4. You'll see the unsubscribe confirmation page
5. Try subscribing again - it should work!

---

## 📊 Subscriber Management

### Check Subscribers (SQL)

```sql
-- Count active email subscribers
SELECT COUNT(*) FROM email_subscriptions WHERE enabled = TRUE;

-- See all subscriptions
SELECT email, subscribed_at, enabled
FROM email_subscriptions
ORDER BY subscribed_at DESC;
```

### View in Supabase Dashboard

1. Go to Supabase → **Table Editor**
2. Select `email_subscriptions` table
3. You'll see all subscribers with emails and status

---

## 🔧 Troubleshooting

### Email not sending

**Check 1: Is RESEND_API_KEY set?**

- Verify in `.env.local` or Vercel environment variables

**Check 2: Is domain verified?**

- Go to Resend → Domains → Check status

**Check 3: Check browser console**

- Look for error messages in admin panel

**Check 4: Check server logs**

- In Vercel → Deployments → Click deployment → Runtime Logs

### Banner not appearing

**Check 1: Already subscribed?**

- Clear localStorage: `localStorage.removeItem('emailSubscribed')`
- Refresh page

**Check 2: Already dismissed?**

- Clear localStorage: `localStorage.removeItem('notificationBannerDismissed')`
- Refresh page

### Resend rate limits (free plan)

- Free plan: **100 emails/day**, 3,000/month
- If you hit limits, emails will queue or fail
- Check Resend dashboard for quota usage
- Upgrade to Pro plan ($20/mo) for 50,000/month

---

## 💡 Best Practices

1. **Don't spam**: Only send notifications for important news
2. **Test first**: Always test on your own email before major sends
3. **Monitor deliverability**: Check Resend dashboard for bounces
4. **Respect unsubscribes**: The system automatically handles this
5. **Keep content short**: Email previews are 300 characters

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Add admin page to view all subscribers
- [ ] Export subscriber list to CSV
- [ ] Segment notifications by runner/team interest
- [ ] A/B test email subject lines
- [ ] Add email templates for different news types
- [ ] Schedule email sends for optimal times

---

## 📞 Support

- **Resend Support**: [Resend Docs](https://resend.com/docs)
- **Resend Troubleshooting**: Check Resend dashboard → Logs
- **Database Issues**: Check Supabase logs

---

**You now have a complete dual notification system! 🎉**

Users can choose:

- ✅ Email (works everywhere, especially iOS!)
- ✅ Push (instant on desktop/Android)
- ✅ Both (maximum reach)








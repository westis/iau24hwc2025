# 📧 Email Confirmation Setup Guide

This guide explains how the double opt-in email notification system works and how to set it up.

---

## 🎯 What Changed

**Before:** Single opt-in (instant subscription, no confirmation)
**Now:** Double opt-in (email confirmation required)

### Key Features

✅ Users must confirm their email address before receiving notifications
✅ Prevents fake/typo email addresses
✅ GDPR-compliant best practice
✅ Users can unsubscribe anytime via link in emails
✅ Confirmation link valid for 7 days

---

## 📋 Database Schema

The `email_subscriptions` table now has these fields:

| Field                | Type      | Description                              |
|----------------------|-----------|------------------------------------------|
| `id`                 | SERIAL    | Primary key                              |
| `email`              | VARCHAR   | Subscriber's email (unique)              |
| `enabled`            | BOOLEAN   | Active subscription (false = unsubscribed) |
| `confirmed`          | BOOLEAN   | Email confirmed (NEW)                    |
| `subscribed_at`      | TIMESTAMP | When they first subscribed               |
| `confirmed_at`       | TIMESTAMP | When they confirmed (NEW)                |
| `unsubscribe_token`  | VARCHAR   | Unique token for unsubscribe link        |
| `confirmation_token` | VARCHAR   | Unique token for confirmation link (NEW) |

---

## 🔧 Setup Instructions

### Step 1: Run Database Migrations

If you **already have** the `email_subscriptions` table:

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/018_add_email_confirmation.sql
```

If you **don't have** the table yet:

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/017_email_subscriptions.sql (updated version)
```

### Step 2: Verify Environment Variables

Make sure these are set in your `.env.local` and Vercel:

```bash
# Resend API key (for sending confirmation emails)
RESEND_API_KEY=re_...

# From email (must be verified in Resend)
RESEND_FROM_EMAIL=noreply@ultramarathon.se

# Site URL (used in email links)
NEXT_PUBLIC_SITE_URL=https://iau24hwc2025.ultramarathon.se
```

### Step 3: Verify Resend Domain

In your [Resend Dashboard](https://resend.com/domains):

1. Add your domain (`ultramarathon.se`)
2. Add the DNS records to your domain
3. Wait for verification (usually 5-10 minutes)
4. Your from email **must** use this verified domain

### Step 4: Test the Flow

1. **Subscribe:**
   - Go to homepage
   - Wait 3 seconds for banner to appear
   - Enter your email and click "Prenumerera"
   - You should see "Bekräfta din e-postadress" message

2. **Check Email:**
   - Open your email inbox
   - Find the confirmation email from "IAU 24h WC 2025"
   - Click the "Bekräfta prenumeration" button

3. **Confirm:**
   - You should land on `/confirm-subscription` page
   - See a green checkmark and "E-post bekräftad!" message
   - The banner should no longer appear on homepage

4. **Verify in Database:**
   ```sql
   SELECT email, confirmed, confirmed_at, enabled
   FROM email_subscriptions
   WHERE email = 'your@email.com';
   ```
   - `confirmed` should be `true`
   - `confirmed_at` should have a timestamp

5. **Test Notification:**
   - Create a news article in admin panel
   - Check "Send Notification" and "Published"
   - Save the article
   - Your confirmed email should receive the notification

---

## 🔍 User Flow

### First-Time Subscriber

```
1. User enters email on banner → Click "Prenumerera"
   ↓
2. System inserts email with confirmed=false
   ↓
3. System sends confirmation email via Resend
   ↓
4. User sees "Bekräfta din e-postadress" message
   ↓
5. User clicks link in email
   ↓
6. System updates confirmed=true, confirmed_at=NOW()
   ↓
7. User sees "E-post bekräftad!" success page
   ↓
8. User receives future news notifications
```

### Returning User (Not Yet Confirmed)

```
1. User enters same email → Click "Prenumerera"
   ↓
2. System finds existing unconfirmed subscription
   ↓
3. System generates NEW confirmation token
   ↓
4. System sends NEW confirmation email
   ↓
5. User sees "Confirmation email sent!" message
```

### Already Confirmed User

```
1. User enters same email → Click "Prenumerera"
   ↓
2. System finds existing confirmed subscription
   ↓
3. User sees "You are already subscribed!" message
```

### Unsubscribed User (Re-subscribing)

```
1. User enters previously unsubscribed email
   ↓
2. System finds subscription with enabled=false, confirmed=true
   ↓
3. System updates enabled=true
   ↓
4. User sees "Subscription reactivated!" message
   ↓
5. No new confirmation needed (already confirmed)
```

---

## 📨 Email Templates

### Confirmation Email

**Subject:** `Bekräfta din e-postprenumeration`

**Content:**
- Branded header with IAU 24h WC 2025 logo colors
- Welcome message in Swedish
- Prominent "Bekräfta prenumeration" button
- Link valid for 7 days
- Note about ignoring if not requested

### News Notification Email

**Subject:** News article title

**Content:**
- Branded header
- News title and excerpt (300 chars)
- "Läs hela nyheten" button linking to full article
- Unsubscribe link in footer

---

## 🔐 Security & Privacy

### GDPR Compliance

✅ **Explicit Consent:** Users must actively confirm via email
✅ **Easy Opt-Out:** Unsubscribe link in every email
✅ **Data Minimization:** Only store email + tokens
✅ **Audit Trail:** Track subscribed_at, confirmed_at
✅ **Soft Deletes:** enabled=false instead of deletion (can resubscribe)

### Token Security

- Tokens are 64-character random hex strings (32 bytes)
- Cryptographically secure via Node.js `crypto.randomBytes()`
- Unique per subscription
- No expiration in database (rely on user to notice stale emails)

---

## 🐛 Troubleshooting

### "Confirmation email sent!" but no email received

1. **Check spam folder** - Most common issue
2. **Verify Resend domain** - Must be verified
3. **Check Resend logs** - [Resend Dashboard](https://resend.com/emails) → Logs
4. **Check from email** - Must match verified domain
5. **Check RESEND_API_KEY** - Make sure it's set correctly

### "Invalid or expired confirmation token"

1. User already confirmed (check `confirmed` field in database)
2. Token was regenerated (happens if user subscribes again before confirming)
3. Manual database edit broke the token

### Notifications not sending to confirmed users

1. **Check database:** `confirmed = true` AND `enabled = true`
2. **Check API logs:** Look for errors in `/api/notifications/email`
3. **Check Resend quota:** Free plan has limits
4. **Test SQL query:**
   ```sql
   SELECT email FROM email_subscriptions
   WHERE enabled = true AND confirmed = true;
   ```

### Banner still appears after confirming

1. **Check localStorage:** `localStorage.getItem("emailSubscribed")` should be `"true"`
2. **Try different browser/incognito** - localStorage is per-browser
3. **Confirmation page** sets this automatically on success

---

## 📊 Admin Queries

### See all confirmed subscribers

```sql
SELECT email, subscribed_at, confirmed_at
FROM email_subscriptions
WHERE confirmed = true AND enabled = true
ORDER BY confirmed_at DESC;
```

### See pending confirmations

```sql
SELECT email, subscribed_at,
  EXTRACT(EPOCH FROM (NOW() - subscribed_at))/3600 AS hours_ago
FROM email_subscriptions
WHERE confirmed = false
ORDER BY subscribed_at DESC;
```

### Count subscribers

```sql
SELECT
  COUNT(*) FILTER (WHERE confirmed = true AND enabled = true) AS active_confirmed,
  COUNT(*) FILTER (WHERE confirmed = false) AS pending_confirmation,
  COUNT(*) FILTER (WHERE enabled = false) AS unsubscribed,
  COUNT(*) AS total
FROM email_subscriptions;
```

### Manually confirm a user (emergency only)

```sql
UPDATE email_subscriptions
SET confirmed = true,
    confirmed_at = NOW()
WHERE email = 'user@example.com';
```

---

## 🔄 Comparison: Push vs Email Notifications

| Feature | 📧 Email (New) | 🔔 Push (Existing) |
|---------|---------------|-------------------|
| **System** | Resend | OneSignal |
| **Requires** | Email confirmation | Browser permission |
| **Works on** | All devices | Desktop + Android |
| **Reliable** | ✅ Very (99.9%) | ⚠️ Medium (depends on browser) |
| **Setup Complexity** | Easy | Medium |
| **Cost** | Free tier: 3,000/month | Free tier: Unlimited |
| **Delivery** | Inbox | Browser notification |
| **User Control** | Click link in email | Site settings + browser |
| **Persistent** | ✅ Yes (in inbox) | ❌ No (disappears) |
| **GDPR Compliance** | ✅ Built-in | ⚠️ Manual |

**Recommendation:** Email is more reliable and user-friendly for this use case.

---

## ✅ Checklist

Before going live, verify:

- [ ] Database migrations run successfully
- [ ] `RESEND_API_KEY` set in Vercel environment
- [ ] `RESEND_FROM_EMAIL` set and domain verified
- [ ] `NEXT_PUBLIC_SITE_URL` set correctly
- [ ] Test subscribe flow with your own email
- [ ] Test confirmation email received
- [ ] Test confirmation link works
- [ ] Test news notification sends to confirmed email
- [ ] Test unsubscribe link works
- [ ] Check Resend logs for any errors

---

## 📚 Related Files

- **Migrations:** `migrations/017_email_subscriptions.sql`, `migrations/018_add_email_confirmation.sql`
- **API Routes:**
  - `app/api/subscriptions/email/route.ts` (subscribe)
  - `app/api/subscriptions/confirm/route.ts` (confirm)
  - `app/api/notifications/email/route.ts` (send notifications - updated)
- **Pages:**
  - `app/confirm-subscription/page.tsx` (confirmation landing page)
  - `app/unsubscribe/page.tsx` (unsubscribe page)
- **Components:** `components/NotificationBanner.tsx` (updated)
- **Docs:** `EMAIL_NOTIFICATIONS_SETUP.md`, `NOTIFICATION_SYSTEM_IMPLEMENTATION.md`

---

**Need help?** Check the Resend docs: https://resend.com/docs


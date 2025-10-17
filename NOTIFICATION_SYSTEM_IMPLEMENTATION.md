# Notification System Implementation Plan

## Database Setup

### 1. Create email_subscriptions table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- Create email_subscriptions table
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX idx_email_subscriptions_token ON email_subscriptions(unsubscribe_token);

-- Enable RLS
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON email_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow users to read their own subscription (for verification)
CREATE POLICY "Users can read own subscription" ON email_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow unsubscribe by token
CREATE POLICY "Allow unsubscribe by token" ON email_subscriptions
  FOR UPDATE TO anon, authenticated
  USING (true);
```

## Environment Variables

### Add to `.env.local` and Vercel:

```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key_here

# From email address (must be verified domain in Resend)
RESEND_FROM_EMAIL=noreply@ultramarathon.se
```

## Implementation Steps

1. ✅ Database migration (run SQL above)
2. ✅ Install Resend SDK
3. ✅ Create email subscription API routes
4. ✅ Create email sending API route
5. ✅ Update news creation to send both email + push
6. ✅ Create visible subscription banner component
7. ✅ Add subscription widget to homepage and news page
8. ✅ Add unsubscribe page

## Features

- Email subscription with double opt-in
- Push notification subscription (existing)
- Users can choose: Email, Push, or Both
- Unsubscribe link in every email
- Admin can see subscriber count
- Better error handling and feedback









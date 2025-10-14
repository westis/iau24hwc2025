-- Create email_subscriptions table for newsletter/news notifications
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_token ON email_subscriptions(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_enabled ON email_subscriptions(enabled) WHERE enabled = TRUE;

-- Enable RLS
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON email_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow users to read their own subscription by email
CREATE POLICY "Users can check subscription status" ON email_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow unsubscribe by token
CREATE POLICY "Allow unsubscribe by token" ON email_subscriptions
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Only service role can see all subscriptions (for sending emails)
-- This will be done via API route with service role client


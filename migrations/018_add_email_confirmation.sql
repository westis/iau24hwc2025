-- Add confirmation fields to email_subscriptions table
-- Run this if you've already created the table without these fields

ALTER TABLE email_subscriptions 
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(255);

-- Create unique index on confirmation_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscriptions_confirmation_token 
ON email_subscriptions(confirmation_token);

-- Add index for confirmed emails
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_confirmed 
ON email_subscriptions(confirmed) WHERE confirmed = TRUE;

-- Generate confirmation tokens for existing subscriptions
UPDATE email_subscriptions 
SET confirmation_token = md5(random()::text || clock_timestamp()::text || email)
WHERE confirmation_token IS NULL;

-- Optionally: Auto-confirm existing subscribers (since they didn't have confirmation before)
-- Uncomment the line below if you want to grandfather in existing subscribers:
-- UPDATE email_subscriptions SET confirmed = TRUE, confirmed_at = NOW() WHERE confirmed = FALSE;








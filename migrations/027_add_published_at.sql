-- Add published_at column to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Set published_at to created_at for existing published articles
UPDATE news 
SET published_at = created_at 
WHERE published = TRUE AND published_at IS NULL;


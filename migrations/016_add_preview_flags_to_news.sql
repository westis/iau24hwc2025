-- Add preview flags and external URLs to news table
-- This allows marking articles as men's or women's race preview
-- and linking to external articles on ultramarathon.se

-- Add columns for preview flags and external URL
ALTER TABLE news
ADD COLUMN IF NOT EXISTS is_preview_men BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_preview_women BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Add indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_news_preview_men ON news(is_preview_men) WHERE is_preview_men = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_preview_women ON news(is_preview_women) WHERE is_preview_women = TRUE;

-- Verify
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'news'
  AND column_name IN ('is_preview_men', 'is_preview_women', 'preview_url');


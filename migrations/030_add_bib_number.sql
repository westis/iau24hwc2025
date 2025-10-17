-- Migration 030: Add bib number to runners table
-- For live race timing identification

-- Add bib number column
ALTER TABLE runners ADD COLUMN IF NOT EXISTS bib INTEGER;

-- Create unique index for bib numbers (only where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_runners_bib ON runners(bib) WHERE bib IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN runners.bib IS 'Race bib number for live timing identification';


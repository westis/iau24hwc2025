-- Migration: Create teams table
-- Description: Store team-level content (photos, descriptions) for each country

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(3) NOT NULL UNIQUE,
  team_photo_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster country lookups
CREATE INDEX IF NOT EXISTS idx_teams_country_code ON teams(country_code);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_teams_updated_at();

-- Comments for documentation
COMMENT ON TABLE teams IS 'Team-level content for each country';
COMMENT ON COLUMN teams.country_code IS '3-letter country code (e.g., SWE, USA, GER)';
COMMENT ON COLUMN teams.team_photo_url IS 'URL to team photo stored in Supabase Storage';
COMMENT ON COLUMN teams.description IS 'Team description/biography text';

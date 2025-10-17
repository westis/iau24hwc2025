-- Migration 022: Create live race tracking tables
-- For storing real-time race data, lap times, and AI-generated updates

-- Create race_config table
CREATE TABLE IF NOT EXISTS race_config (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,
  
  -- Race state
  race_state VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (race_state IN ('not_started', 'live', 'finished')),
  
  -- Course data
  course_geojson JSONB, -- GeoJSON of course loop
  course_distance_km NUMERIC(6, 3), -- Loop distance in km
  timing_point_offset INTEGER DEFAULT 0, -- Offset in meters from start line
  
  -- Data source configuration
  data_source VARCHAR(255), -- URL or identifier of timing system
  last_data_fetch TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one config per race
CREATE UNIQUE INDEX IF NOT EXISTS idx_race_config_race_id ON race_config(race_id);

-- Create race_laps table for storing lap timing data
CREATE TABLE IF NOT EXISTS race_laps (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,
  bib INTEGER NOT NULL,
  
  -- Lap data
  lap INTEGER NOT NULL,
  lap_time_sec NUMERIC(10, 2) NOT NULL,
  race_time_sec NUMERIC(12, 2) NOT NULL,
  distance_km NUMERIC(8, 3) NOT NULL,
  
  -- Rankings
  rank INTEGER,
  gender_rank INTEGER,
  age_group_rank INTEGER,
  
  -- Pace data (in seconds per km)
  lap_pace NUMERIC(8, 2),
  avg_pace NUMERIC(8, 2),
  
  -- Timestamp when this lap was recorded
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_race_laps_bib ON race_laps(race_id, bib, lap);
CREATE INDEX IF NOT EXISTS idx_race_laps_timestamp ON race_laps(race_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_race_laps_rank ON race_laps(race_id, rank) WHERE rank IS NOT NULL;

-- Unique constraint: one entry per race/bib/lap combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_race_laps_unique ON race_laps(race_id, bib, lap);

-- Create race_leaderboard table for current standings
CREATE TABLE IF NOT EXISTS race_leaderboard (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,
  bib INTEGER NOT NULL,
  
  -- Runner info
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(1) NOT NULL CHECK (gender IN ('m', 'w')),
  country VARCHAR(3) NOT NULL,
  
  -- Current position
  rank INTEGER NOT NULL,
  gender_rank INTEGER NOT NULL,
  
  -- Distance and pace
  distance_km NUMERIC(8, 3) NOT NULL,
  projected_km NUMERIC(8, 3), -- Projected distance at 24h based on current avg pace
  race_time_sec NUMERIC(12, 2) NOT NULL,
  lap_pace_sec NUMERIC(8, 2),
  lap_time_sec NUMERIC(10, 2),
  lap INTEGER NOT NULL,
  
  -- Trend indicator
  trend VARCHAR(10) CHECK (trend IN ('up', 'down', 'stable')),
  
  -- Last passing time
  last_passing TIMESTAMP WITH TIME ZONE,
  
  -- Data timestamp
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_race_leaderboard_rank ON race_leaderboard(race_id, rank);
CREATE INDEX IF NOT EXISTS idx_race_leaderboard_bib ON race_leaderboard(race_id, bib);
CREATE INDEX IF NOT EXISTS idx_race_leaderboard_gender ON race_leaderboard(race_id, gender, gender_rank);

-- Unique constraint: one entry per race/bib
CREATE UNIQUE INDEX IF NOT EXISTS idx_race_leaderboard_unique ON race_leaderboard(race_id, bib);

-- Create race_updates table for AI-generated commentary and milestones
CREATE TABLE IF NOT EXISTS race_updates (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,
  
  -- Update content
  content TEXT NOT NULL,
  content_sv TEXT, -- Swedish translation
  
  -- Update type and priority
  update_type VARCHAR(20) NOT NULL CHECK (update_type IN ('ai', 'milestone', 'lead_change', 'manual')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Related entities (for filtering)
  related_bibs INTEGER[], -- Array of related runner bibs
  related_countries VARCHAR(3)[], -- Array of related country codes
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- When the event occurred
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for updates queries
CREATE INDEX IF NOT EXISTS idx_race_updates_timestamp ON race_updates(race_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_race_updates_type ON race_updates(race_id, update_type);
CREATE INDEX IF NOT EXISTS idx_race_updates_priority ON race_updates(race_id, priority, timestamp DESC);

-- Create indexes for GIN searches on arrays
CREATE INDEX IF NOT EXISTS idx_race_updates_bibs ON race_updates USING GIN(related_bibs);
CREATE INDEX IF NOT EXISTS idx_race_updates_countries ON race_updates USING GIN(related_countries);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE race_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_laps ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_updates ENABLE ROW LEVEL SECURITY;

-- Public read access for all live race tables
CREATE POLICY "Public read access for race_config"
  ON race_config FOR SELECT
  USING (true);

CREATE POLICY "Public read access for race_laps"
  ON race_laps FOR SELECT
  USING (true);

CREATE POLICY "Public read access for race_leaderboard"
  ON race_leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Public read access for race_updates"
  ON race_updates FOR SELECT
  USING (true);

-- Admin write access (authenticated users with admin role can write)
-- Note: You'll need to adjust this based on your auth setup
CREATE POLICY "Admin write access for race_config"
  ON race_config FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin write access for race_laps"
  ON race_laps FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin write access for race_leaderboard"
  ON race_leaderboard FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin write access for race_updates"
  ON race_updates FOR ALL
  USING (auth.role() = 'authenticated');

-- Insert initial race config for the IAU 24H WC 2025
INSERT INTO race_config (race_id, race_state, course_distance_km)
SELECT id, 'not_started', 0.821
FROM race_info
WHERE is_active = true
LIMIT 1;








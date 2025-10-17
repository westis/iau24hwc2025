-- Migration 031: Add lap tracking fields
-- For calculating laps from distance increases

-- Add last known distance to track changes between updates
ALTER TABLE race_leaderboard ADD COLUMN IF NOT EXISTS last_known_distance_km NUMERIC(8, 3);

-- Add first lap distance configuration (100m start offset)
ALTER TABLE race_config ADD COLUMN IF NOT EXISTS first_lap_distance_km NUMERIC(6, 3) DEFAULT 0.100;

-- Add comments for documentation
COMMENT ON COLUMN race_leaderboard.last_known_distance_km IS 'Last recorded distance for lap change detection';
COMMENT ON COLUMN race_config.first_lap_distance_km IS 'First lap distance in km (e.g., 0.100 for 100m start offset)';





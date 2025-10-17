-- Add simulation mode fields to race_config table
-- Run this migration to enable simulation mode features

-- Add simulation_mode column
ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS simulation_mode BOOLEAN DEFAULT FALSE;

-- Add current_race_time_sec for simulation clock
ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS current_race_time_sec INTEGER DEFAULT 0;

-- Add simulation_start_time
ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS simulation_start_time TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN race_config.simulation_mode IS 'Whether the race is in simulation mode for testing';
COMMENT ON COLUMN race_config.current_race_time_sec IS 'Current simulated race time in seconds (for simulation mode)';
COMMENT ON COLUMN race_config.simulation_start_time IS 'When simulation started (for reference)';





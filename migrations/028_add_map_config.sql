-- Migration: Add map configuration fields to race_config
-- This adds fields needed for the live race map feature

ALTER TABLE race_config 
  ADD COLUMN IF NOT EXISTS timing_mat_lat DOUBLE PRECISION DEFAULT 43.9232716,
  ADD COLUMN IF NOT EXISTS timing_mat_lon DOUBLE PRECISION DEFAULT 2.1670189,
  ADD COLUMN IF NOT EXISTS break_detection_threshold_multiplier DECIMAL(3,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS overdue_display_seconds INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS course_gpx_url TEXT DEFAULT '/course/albi-24h.gpx';

-- Add comment for documentation
COMMENT ON COLUMN race_config.timing_mat_lat IS 'Latitude of timing mat location on course (default: first point of Albi GPX track)';
COMMENT ON COLUMN race_config.timing_mat_lon IS 'Longitude of timing mat location on course (default: first point of Albi GPX track)';
COMMENT ON COLUMN race_config.break_detection_threshold_multiplier IS 'Multiplier for detecting when runner is on break (e.g., 2.5 means 2.5x predicted lap time)';
COMMENT ON COLUMN race_config.overdue_display_seconds IS 'How long to show overdue runners at timing mat before marking as on break (in seconds)';
COMMENT ON COLUMN race_config.course_gpx_url IS 'URL path to GPX file for course track';

-- Note: Default timing mat coordinates are set to the first point in the Albi 24h GPX file.
-- Administrators can update these coordinates via database if needed:
-- UPDATE race_config SET timing_mat_lat = YOUR_LAT, timing_mat_lon = YOUR_LON WHERE race_id = 1;


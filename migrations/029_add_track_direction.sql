-- Add track direction configuration for live map
-- This determines whether runners progress along the GPX track in original or reversed order

ALTER TABLE race_config 
  ADD COLUMN IF NOT EXISTS reverse_track_direction BOOLEAN DEFAULT false;

COMMENT ON COLUMN race_config.reverse_track_direction IS 
  'If true, runners progress in reverse order along GPX track (e.g., if GPX recorded clockwise but race runs counterclockwise)';




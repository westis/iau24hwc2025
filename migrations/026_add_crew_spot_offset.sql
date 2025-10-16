-- Migration 026: Add crew spot offset to race_config
-- Allows admins to configure crew spot location relative to timing mat

ALTER TABLE race_config 
ADD COLUMN IF NOT EXISTS crew_spot_offset_meters INTEGER DEFAULT 0;

COMMENT ON COLUMN race_config.crew_spot_offset_meters IS 
'Offset in meters from timing mat. Positive = after timing mat, Negative = before timing mat';


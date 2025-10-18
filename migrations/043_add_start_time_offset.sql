-- Migration 043: Add start time offset to race_config
-- The race may start slightly late, causing a discrepancy between:
-- - True race time (from gun start, shown in lap modals)
-- - Clock time (lastPassing timestamp from timing mat)
--
-- Example: Race started 19 seconds late
-- - If gun fired at 10:00:19 instead of 10:00:00
-- - Lap modal shows "4:33:23" (true race time)
-- - Last passing shows "10:04:33:42" (clock time)
-- - Offset = 19 seconds

ALTER TABLE race_config
ADD COLUMN IF NOT EXISTS start_time_offset_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN race_config.start_time_offset_seconds IS
  'Number of seconds the race started late. Subtract this from (lastPassing - race_start_date) to get true race time.';

-- Set the offset for the active race (19 seconds late)
UPDATE race_config
SET start_time_offset_seconds = 19
WHERE race_id = (SELECT id FROM race_info WHERE is_active = true LIMIT 1);

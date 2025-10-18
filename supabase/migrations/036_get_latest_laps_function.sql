-- Create function to get latest lap per runner
-- This bypasses the 1000-row limit by doing the aggregation in the database
CREATE OR REPLACE FUNCTION get_latest_laps_per_runner(race_id_param integer)
RETURNS TABLE (
  bib integer,
  lap integer,
  distance_km numeric,
  race_time_sec integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (bib)
    bib,
    lap,
    distance_km,
    race_time_sec
  FROM race_laps
  WHERE race_id = race_id_param
  ORDER BY bib, lap DESC;
$$;

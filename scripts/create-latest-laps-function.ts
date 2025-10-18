// Apply migration to create get_latest_laps_per_runner function
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

async function applyMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sql = `
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
  `;

  console.log("Creating get_latest_laps_per_runner function...");

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("✅ Function created successfully!");
  }
}

applyMigration().catch(console.error);
